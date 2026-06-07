import type { ClockifyClaims } from './auth';
import {
	getInstallToken,
	exportInvoicePdf,
	getInvoice,
	updateInvoiceNote
} from './clients/clockify';
import { createInvoice, issueInvoice, uploadAttachment } from './clients/request-finance';
import { NOTE_LINK_PREFIX } from './config';
import { BadRequestError } from './errors';
import { getMapping, insertMapping } from './db/idempotency';
import { getDb } from './db/index';
import { buildRfLineItems } from './money';
import { getRfToken } from './rf-token';
import { loadWorkspaceSettings, resolveRfClientId } from './settings';
import type { RfCreateInvoiceBody } from './types/rf';

export interface GenerateOverrides {
	/** Chosen by the user on the action iframe before submit. */
	chain: string;
	settlementCurrencies: string[];
	receivingWalletAddress: string;
}

export interface GenerateResult {
	paymentLink: string;
	rfInvoiceId: string;
	rfRequestId?: string;
	reused: boolean;
}

export async function generateRfInvoice(
	env: Env,
	claims: ClockifyClaims,
	invoiceId: string,
	overrides: GenerateOverrides
): Promise<GenerateResult> {
	const workspaceId = claims.workspaceId;
	const db = getDb(env);
	const existing = await getMapping(db, workspaceId, invoiceId);
	if (existing) {
		return {
			paymentLink: existing.payment_link,
			rfInvoiceId: existing.rf_invoice_id,
			rfRequestId: existing.rf_request_id ?? undefined,
			reused: true
		};
	}

	const installToken = await getInstallToken(db, workspaceId, env);
	const clockifyOpts = { backendUrl: claims.backendUrl, installToken };
	const settings = await loadWorkspaceSettings(claims.backendUrl, workspaceId, installToken, env);

	const invoice = await getInvoice(clockifyOpts, workspaceId, invoiceId);
	const rfClientId = resolveRfClientId(settings, invoice.clientId);
	const rfApiKey = await getRfToken(workspaceId, env);

	const pdfBytes = await exportInvoicePdf(clockifyOpts, workspaceId, invoiceId);
	const attachment = await uploadAttachment(rfApiKey, pdfBytes);

	const invoiceNumber = invoice.number?.trim() || invoice.id;
	const lineItems = buildRfLineItems(invoice);

	const chain = overrides.chain?.trim();
	if (!chain) {
		throw new BadRequestError('Chain is required');
	}
	const currencies = overrides.settlementCurrencies?.map((c) => c.trim()).filter(Boolean);
	if (!currencies?.length) {
		throw new BadRequestError('At least one settlement currency is required');
	}
	const wallet = overrides.receivingWalletAddress?.trim();
	if (!wallet) {
		throw new BadRequestError('Receiving wallet address is required');
	}

	const createBody: RfCreateInvoiceBody = {
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
					currencies,
					paymentInformation: { paymentAddress: wallet, chain }
				}
			}
		],
		...(settings.reverseChargeNote?.trim() ? { note: settings.reverseChargeNote.trim() } : {}),
		attachments: [attachment],
		miscellaneous: {
			invoiceTemplateId: settings.rfInvoiceTemplateId || undefined,
			logoUrl: settings.sellerLogoUrl || undefined
		}
	};

	const created = await createInvoice(rfApiKey, createBody);
	const issued = await issueInvoice(rfApiKey, created.id);
	const paymentLink = issued.invoiceLinks?.signUpAndPay;
	if (!paymentLink) {
		throw new Error('Request Finance did not return a payment link');
	}

	const noteLine = `${NOTE_LINK_PREFIX}${paymentLink}`;
	await updateInvoiceNote(clockifyOpts, workspaceId, invoiceId, noteLine);

	await insertMapping(db, {
		workspace_id: workspaceId,
		clockify_invoice_id: invoiceId,
		rf_invoice_id: created.id,
		rf_request_id: issued.requestId ?? null,
		payment_link: paymentLink
	});

	return {
		paymentLink,
		rfInvoiceId: created.id,
		rfRequestId: issued.requestId,
		reused: false
	};
}
