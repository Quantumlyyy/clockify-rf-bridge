import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInvoice, uploadAttachment } from './request-finance';
import type { RfCreateInvoiceBody } from '../types/rf';

describe('request-finance client', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uploads multipart without manual Content-Type', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ name: 'f', fileName: 'f.pdf', hash: 'h' }), { status: 200 })
			);
		vi.stubGlobal('fetch', fetchMock);

		await uploadAttachment('api-key', new Uint8Array([1, 2, 3]));

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		expect(init.headers).not.toHaveProperty('Content-Type');
		expect(init.body).toBeInstanceOf(FormData);
	});

	it('creates invoice with expected shape', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ id: 'rf-1' }), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const body: RfCreateInvoiceBody = {
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

		const res = await createInvoice('api-key', body);
		expect(res.id).toBe('rf-1');
		const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
		expect(sent.meta.format).toBe('rnf_invoice');
	});
});
