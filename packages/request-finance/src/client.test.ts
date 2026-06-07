import { describe, expect, it, vi, afterEach } from 'vitest';
import { Effect, Exit } from 'effect';
import { RequestFinanceClient, RequestFinanceClientLive } from './client';
import type { CreateInvoiceRequest } from './schema/api';

describe('request-finance client', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const run = <A, E>(effect: Effect.Effect<A, E, RequestFinanceClient>) =>
		Effect.runPromise(effect.pipe(Effect.provide(RequestFinanceClientLive)));

	it('uploads multipart without manual Content-Type', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ name: 'f', fileName: 'f.pdf', hash: 'h' }), { status: 200 })
			);
		vi.stubGlobal('fetch', fetchMock);

		await run(
			Effect.gen(function* () {
				const rf = yield* RequestFinanceClient;
				yield* rf.uploadAttachment('api-key', new Uint8Array([1, 2, 3]));
			})
		);

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		expect(init.headers).not.toHaveProperty('Content-Type');
		expect(init.body).toBeInstanceOf(FormData);
	});

	it('creates invoice with expected shape', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ id: 'rf-1' }), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const body: CreateInvoiceRequest = {
			meta: { format: 'rnf_invoice', version: '0.0.3' },
			creationDate: '2024-01-01',
			invoiceItems: [{ currency: 'USD', name: 'Work', quantity: '1', unitPrice: '10000' }],
			invoiceNumber: 'CLK-1',
			clientId: 'buyer-1',
			paymentTerms: { dueDate: '2024-01-31' },
			paymentOptions: [
				{
					type: 'wallet',
					value: {
						currencies: ['USDC-mainnet'],
						paymentInformation: { paymentAddress: '0xabc', chain: 'mainnet' }
					}
				}
			]
		};

		const res = await run(
			Effect.gen(function* () {
				const rf = yield* RequestFinanceClient;
				return yield* rf.createInvoice('api-key', body);
			})
		);

		expect(res.id).toBe('rf-1');
		const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
		expect(sent.meta.format).toBe('rnf_invoice');
	});

	it('issues invoice and parses payment link', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					requestId: 'req-1',
					invoiceLinks: { signUpAndPay: 'https://pay.example/issue' }
				}),
				{ status: 200 }
			)
		);
		vi.stubGlobal('fetch', fetchMock);

		const res = await run(
			Effect.gen(function* () {
				const rf = yield* RequestFinanceClient;
				return yield* rf.issueInvoice('api-key', 'rf-99');
			})
		);

		expect(res.invoiceLinks?.signUpAndPay).toBe('https://pay.example/issue');
		expect(String(fetchMock.mock.calls[0][0])).toContain('/invoices/rf-99');
	});

	it('maps RF HTTP errors to RfHttpError', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('bad request', { status: 400, statusText: 'Bad Request' }));
		vi.stubGlobal('fetch', fetchMock);

		const exit = await Effect.runPromiseExit(
			Effect.gen(function* () {
				const rf = yield* RequestFinanceClient;
				return yield* rf.issueInvoice('api-key', 'rf-bad');
			}).pipe(Effect.provide(RequestFinanceClientLive))
		);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = exit.cause;
			expect(String(error)).toContain('RfHttpError');
		}
	});
});
