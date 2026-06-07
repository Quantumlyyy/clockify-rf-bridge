import { Effect, Schedule } from 'effect';
import {
	RequestFinanceClient,
	RfHttpError,
	type CreateInvoiceRequest
} from '@clockify-rf-bridge/request-finance';
import {
	ClockifyClientTag,
	InvoiceContextTag,
	ValidationError,
	WorkspaceClientTag,
	type GenerateOverrides,
	type GenerateResult,
	type GenerateError
} from './types';

const transientRetry = Schedule.recurs(2).pipe(
	Schedule.addDelay(() => '200 millis'),
	Schedule.whileInput((error: unknown) => error instanceof RfHttpError && error.status >= 500)
);

function validateOverrides(
	overrides: GenerateOverrides
): Effect.Effect<{ chain: string; currencies: string[]; wallet: string }, ValidationError> {
	const chain = overrides.chain?.trim();
	if (!chain) return Effect.fail(new ValidationError({ message: 'Chain is required' }));

	const currencies = overrides.settlementCurrencies?.map((c) => c.trim()).filter(Boolean);
	if (!currencies?.length) {
		return Effect.fail(
			new ValidationError({ message: 'At least one settlement currency is required' })
		);
	}

	const wallet = overrides.receivingWalletAddress?.trim();
	if (!wallet) {
		return Effect.fail(new ValidationError({ message: 'Receiving wallet address is required' }));
	}

	return Effect.succeed({ chain, currencies, wallet });
}

export function generateRfInvoice(
	invoiceId: string,
	overrides: GenerateOverrides
): Effect.Effect<
	GenerateResult,
	GenerateError,
	ClockifyClientTag | WorkspaceClientTag | InvoiceContextTag | RequestFinanceClient
> {
	return Effect.gen(function* () {
		const workspace = yield* WorkspaceClientTag;
		const clockify = yield* ClockifyClientTag;
		const ctx = yield* InvoiceContextTag;
		const rf = yield* RequestFinanceClient;

		const existing = yield* workspace.getMapping(invoiceId);
		if (existing) {
			return {
				paymentLink: existing.payment_link,
				rfInvoiceId: existing.rf_invoice_id,
				...(existing.rf_request_id != null ? { rfRequestId: existing.rf_request_id } : {}),
				reused: true
			};
		}

		const run = yield* workspace.getRun(invoiceId);
		const validated = yield* validateOverrides(overrides);

		yield* workspace.upsertRun({
			clockify_invoice_id: invoiceId,
			status: run?.status ?? 'pending'
		});

		let attachmentHash = run?.rf_attachment_hash ?? null;
		let attachment: { name: string; fileName: string; hash: string } | null = null;

		if (!attachmentHash || !run?.rf_invoice_id) {
			const pdfBytes = yield* clockify.exportInvoicePdf(invoiceId);
			attachment = yield* rf
				.uploadAttachment(ctx.rfApiKey, pdfBytes)
				.pipe(Effect.retry(transientRetry));
			attachmentHash = attachment.hash;
			yield* workspace.upsertRun({
				clockify_invoice_id: invoiceId,
				status: 'pdf_uploaded',
				rf_attachment_hash: attachmentHash
			});
		}

		let rfInvoiceId = run?.rf_invoice_id ?? null;
		if (!rfInvoiceId) {
			const invoice = yield* clockify.getInvoice(invoiceId);
			const clockifyClientId = invoice.clientId?.trim();
			if (!clockifyClientId) {
				return yield* Effect.fail(
					new ValidationError({ message: 'Clockify invoice has no client ID' })
				);
			}
			const rfClientId = yield* ctx.resolveRfClientId(clockifyClientId);
			const invoiceNumber = invoice.number?.trim() || invoice.id;
			const lineItems = ctx.buildLineItems(invoice);

			const createBody: CreateInvoiceRequest = {
				meta: { format: 'rnf_invoice', version: '0.0.3' },
				creationDate: invoice.issuedDate,
				invoiceItems: lineItems,
				invoiceNumber,
				clientId: rfClientId,
				paymentTerms: { dueDate: invoice.dueDate },
				paymentOptions: [
					{
						type: 'wallet',
						value: {
							currencies: validated.currencies,
							paymentInformation: {
								paymentAddress: validated.wallet,
								chain: validated.chain
							}
						}
					}
				],
				...(ctx.settings.reverseChargeNote?.trim()
					? { note: ctx.settings.reverseChargeNote.trim() }
					: {}),
				...(attachment ? { attachments: [attachment] } : {}),
				miscellaneous: {
					invoiceTemplateId: ctx.settings.rfInvoiceTemplateId || undefined,
					logoUrl: ctx.settings.sellerLogoUrl || undefined
				}
			};

			const created = yield* rf
				.createInvoice(ctx.rfApiKey, createBody)
				.pipe(Effect.retry(transientRetry));
			rfInvoiceId = created.id;
			yield* workspace.upsertRun({
				clockify_invoice_id: invoiceId,
				status: 'created',
				rf_invoice_id: rfInvoiceId
			});
		}

		let rfRequestId = run?.rf_request_id ?? null;
		let paymentLink = run?.payment_link ?? null;

		if (!paymentLink) {
			const issued = yield* rf
				.issueInvoice(ctx.rfApiKey, rfInvoiceId)
				.pipe(Effect.retry(transientRetry));
			rfRequestId = issued.requestId ?? null;
			paymentLink = issued.invoiceLinks?.signUpAndPay ?? null;
			if (!paymentLink) {
				yield* workspace.upsertRun({
					clockify_invoice_id: invoiceId,
					status: 'failed',
					rf_invoice_id: rfInvoiceId,
					error_message: 'Request Finance did not return a payment link'
				});
				return yield* Effect.fail(
					new ValidationError({ message: 'Request Finance did not return a payment link' })
				);
			}
			yield* workspace.upsertRun({
				clockify_invoice_id: invoiceId,
				status: 'issued',
				rf_invoice_id: rfInvoiceId,
				rf_request_id: rfRequestId,
				payment_link: paymentLink
			});
		}

		const noteLine = `${ctx.noteLinkPrefix}${paymentLink}`;
		yield* clockify.updateInvoiceNote(invoiceId, noteLine);
		yield* workspace.upsertRun({
			clockify_invoice_id: invoiceId,
			status: 'note_updated',
			rf_invoice_id: rfInvoiceId,
			rf_request_id: rfRequestId,
			payment_link: paymentLink
		});

		yield* workspace.insertMapping({
			clockify_invoice_id: invoiceId,
			rf_invoice_id: rfInvoiceId,
			rf_request_id: rfRequestId,
			payment_link: paymentLink
		});

		yield* workspace.upsertRun({
			clockify_invoice_id: invoiceId,
			status: 'completed',
			rf_invoice_id: rfInvoiceId,
			rf_request_id: rfRequestId,
			payment_link: paymentLink
		});

		return {
			paymentLink,
			rfInvoiceId,
			...(rfRequestId != null ? { rfRequestId } : {}),
			reused: false
		};
	}).pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				if (error instanceof ValidationError) return yield* Effect.fail(error);
				const workspace = yield* WorkspaceClientTag;
				yield* workspace
					.upsertRun({
						clockify_invoice_id: invoiceId,
						status: 'failed',
						error_message: String(error)
					})
					.pipe(Effect.catchAll(() => Effect.void));
				return yield* Effect.fail(error);
			})
		)
	);
}
