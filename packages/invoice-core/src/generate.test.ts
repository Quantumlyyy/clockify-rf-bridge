import { describe, expect, it } from 'vitest';
import { Effect, Layer } from 'effect';
import { RequestFinanceClient } from '@clockify-rf-bridge/request-finance';
import { generateRfInvoice } from './generate';
import { ClockifyClientTag, InvoiceContextTag, WorkspaceClientTag } from './types';

describe('generateRfInvoice', () => {
	it('returns cached payment link when mapping exists', async () => {
		const result = await Effect.runPromise(
			generateRfInvoice('inv-1', {
				chain: 'mainnet',
				settlementCurrencies: ['USDC-mainnet'],
				receivingWalletAddress: '0xabc'
			}).pipe(
				Effect.provide(
					Layer.mergeAll(
						Layer.succeed(WorkspaceClientTag, {
							getMapping: () =>
								Effect.succeed({
									clockify_invoice_id: 'inv-1',
									rf_invoice_id: 'rf-existing',
									rf_request_id: 'req-1',
									payment_link: 'https://pay.example/existing'
								}),
							insertMapping: () => Effect.void,
							getRun: () => Effect.succeed(null),
							upsertRun: () => Effect.void
						}),
						Layer.succeed(ClockifyClientTag, {
							getInstallToken: () => Effect.succeed('tok'),
							getInvoice: () => Effect.die('unexpected'),
							exportInvoicePdf: () => Effect.die('unexpected'),
							updateInvoiceNote: () => Effect.die('unexpected')
						}),
						Layer.succeed(InvoiceContextTag, {
							rfApiKey: 'key',
							settings: {},
							noteLinkPrefix: 'Pay: ',
							buildLineItems: () => [],
							resolveRfClientId: (_clockifyClientId) => Effect.succeed('rf-client-1')
						}),
						Layer.succeed(RequestFinanceClient, {
							uploadAttachment: () => Effect.die('unexpected'),
							createInvoice: () => Effect.die('unexpected'),
							issueInvoice: () => Effect.die('unexpected'),
							getInvoiceWithLinks: () => Effect.die('unexpected'),
							listClients: () => Effect.die('unexpected')
						})
					)
				)
			)
		);

		expect(result.reused).toBe(true);
		expect(result.paymentLink).toBe('https://pay.example/existing');
	});

	it('creates, issues, and completes a new invoice', async () => {
		const upsertCalls: string[] = [];
		const result = await Effect.runPromise(
			generateRfInvoice('inv-new', {
				chain: 'mainnet',
				settlementCurrencies: ['USDC-mainnet'],
				receivingWalletAddress: '0xabc'
			}).pipe(
				Effect.provide(
					Layer.mergeAll(
						Layer.succeed(WorkspaceClientTag, {
							getMapping: () => Effect.succeed(null),
							insertMapping: () => Effect.void,
							getRun: () => Effect.succeed(null),
							upsertRun: (run) => {
								upsertCalls.push(run.status);
								return Effect.void;
							}
						}),
						Layer.succeed(ClockifyClientTag, {
							getInstallToken: () => Effect.succeed('tok'),
							getInvoice: () =>
								Effect.succeed({
									id: 'inv-new',
									number: 'CLK-99',
									issuedDate: '2024-01-01',
									dueDate: '2024-01-31',
									clientId: 'clk-client',
									currency: 'USD',
									taxPercent: 0,
									items: [
										{
											description: 'Work',
											quantity: 1,
											unitPrice: 100,
											amount: 100
										}
									]
								}),
							exportInvoicePdf: () => Effect.succeed(new Uint8Array([1, 2, 3])),
							updateInvoiceNote: () => Effect.void
						}),
						Layer.succeed(InvoiceContextTag, {
							rfApiKey: 'key',
							settings: {},
							noteLinkPrefix: 'Pay: ',
							buildLineItems: () => [
								{
									currency: 'USD',
									name: 'Work',
									quantity: '1',
									unitPrice: '10000'
								}
							],
							resolveRfClientId: () => Effect.succeed('rf-client-1')
						}),
						Layer.succeed(RequestFinanceClient, {
							uploadAttachment: () =>
								Effect.succeed({
									name: 'invoice.pdf',
									fileName: 'invoice.pdf',
									hash: 'hash-1'
								}),
							createInvoice: () => Effect.succeed({ id: 'rf-new' }),
							issueInvoice: () =>
								Effect.succeed({
									requestId: 'req-new',
									invoiceLinks: { signUpAndPay: 'https://pay.example/new' }
								}),
							getInvoiceWithLinks: () => Effect.die('unexpected'),
							listClients: () => Effect.die('unexpected')
						})
					)
				)
			)
		);

		expect(result.reused).toBe(false);
		expect(result.paymentLink).toBe('https://pay.example/new');
		expect(result.rfInvoiceId).toBe('rf-new');
		expect(upsertCalls).toContain('completed');
	});
});
