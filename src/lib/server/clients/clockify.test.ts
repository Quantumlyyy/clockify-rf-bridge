import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportInvoicePdf, updateInvoiceNote } from './clockify';

const opts = {
	backendUrl: 'https://api.clockify.me/api',
	installToken: 'install-token'
};

describe('clockify client', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('decodes base64 PDF export', async () => {
		const pdf = 'Hello';
		const b64 = btoa(pdf);
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify(b64), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		const bytes = await exportInvoicePdf(opts, 'ws-1', 'inv-1');
		expect(new TextDecoder().decode(bytes)).toBe('Hello');
	});

	it('updateInvoiceNote sends full PUT body', async () => {
		const invoice = {
			id: 'inv-1',
			number: '1',
			currency: 'USD',
			issuedDate: '2024-01-01',
			dueDate: '2024-01-31',
			clientId: 'c-1',
			companyId: 'co-1',
			taxPercent: 0,
			tax2Percent: 0,
			discountPercent: 0,
			subject: 'Subject',
			note: 'Existing',
			items: []
		};

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify(invoice), { status: 200 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ...invoice, note: 'x' }), { status: 200 })
			);
		vi.stubGlobal('fetch', fetchMock);

		await updateInvoiceNote(opts, 'ws-1', 'inv-1', 'Pay link');

		const putCall = fetchMock.mock.calls[1];
		expect(putCall[0]).toContain('/invoices/inv-1');
		expect(putCall[1]?.method).toBe('PUT');
		const body = JSON.parse(String(putCall[1]?.body));
		expect(body.currency).toBe('USD');
		expect(body.clientId).toBe('c-1');
		expect(body.note).toContain('Existing');
		expect(body.note).toContain('Pay link');
	});
});
