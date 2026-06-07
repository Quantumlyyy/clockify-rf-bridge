import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ClockifyInvoice } from './types/clockify';
import type { ClockifyClaims } from './auth';

const claims: ClockifyClaims = {
	backendUrl: 'https://api.clockify.me/api',
	workspaceId: 'ws-1'
};

const sampleInvoice: ClockifyInvoice = {
	id: 'inv-1',
	number: 'CLK-1',
	issuedDate: '2024-01-01',
	dueDate: '2024-01-31',
	clientId: 'clk-client',
	companyId: 'co-1',
	currency: 'USD',
	taxPercent: 0,
	items: [{ description: 'Work', quantity: 1, unitPrice: 100, amount: 100 }]
};

vi.mock('@clockify-rf-bridge/workspace-store', () => ({
	getMapping: vi.fn(),
	insertMapping: vi.fn(),
	getRun: vi.fn(),
	upsertRun: vi.fn()
}));

vi.mock('./clients/clockify', () => ({
	getInstallToken: vi.fn(),
	getInvoice: vi.fn(),
	exportInvoicePdf: vi.fn(),
	updateInvoiceNote: vi.fn()
}));

vi.mock('./rf-token', () => ({
	getRfToken: vi.fn()
}));

vi.mock('./settings', () => ({
	loadWorkspaceSettings: vi.fn(),
	resolveRfClientId: vi.fn()
}));

import { getMapping, getRun, insertMapping, upsertRun } from '@clockify-rf-bridge/workspace-store';
import {
	getInstallToken,
	getInvoice,
	exportInvoicePdf,
	updateInvoiceNote
} from './clients/clockify';
import { getRfToken } from './rf-token';
import { loadWorkspaceSettings, resolveRfClientId } from './settings';
import { generateRfInvoice } from './orchestrate';

describe('orchestrate', () => {
	beforeEach(() => {
		vi.mocked(getMapping).mockReset();
		vi.mocked(getRun).mockReset();
		vi.mocked(insertMapping).mockResolvedValue({
			clockify_invoice_id: 'inv-1',
			rf_invoice_id: 'rf-new',
			rf_request_id: 'req-1',
			payment_link: 'https://pay.example/full',
			created_at: '2024-01-01'
		});
		vi.mocked(upsertRun).mockResolvedValue({
			clockify_invoice_id: 'inv-1',
			status: 'completed',
			rf_attachment_hash: null,
			rf_invoice_id: 'rf-new',
			rf_request_id: 'req-1',
			payment_link: 'https://pay.example/full',
			error_message: null,
			updated_at: '2024-01-01'
		});
		vi.mocked(getInstallToken).mockResolvedValue('install-token');
		vi.mocked(getRfToken).mockResolvedValue('rf-key');
		vi.mocked(loadWorkspaceSettings).mockResolvedValue({});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('returns cached payment link when mapping exists', async () => {
		vi.mocked(getMapping).mockResolvedValue({
			clockify_invoice_id: 'inv-1',
			rf_invoice_id: 'rf-existing',
			rf_request_id: 'req-1',
			payment_link: 'https://pay.example/existing',
			created_at: '2024-01-01'
		});

		const result = await generateRfInvoice({ WORKSPACE: {} } as Env, claims, 'inv-1', {
			chain: 'mainnet',
			settlementCurrencies: ['USDC-mainnet'],
			receivingWalletAddress: '0xabc'
		});
		expect(result.reused).toBe(true);
		expect(result.paymentLink).toBe('https://pay.example/existing');
	});

	it('runs full create flow when no mapping exists', async () => {
		vi.mocked(getMapping).mockResolvedValue(null);
		vi.mocked(getRun).mockResolvedValue(null);
		vi.mocked(getInvoice).mockResolvedValue(sampleInvoice);
		vi.mocked(exportInvoicePdf).mockResolvedValue(new Uint8Array([1]));
		vi.mocked(updateInvoiceNote).mockResolvedValue(sampleInvoice);
		vi.mocked(resolveRfClientId).mockResolvedValue('rf-client-1');

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ name: 'f', fileName: 'f.pdf', hash: 'h1' }), {
					status: 200
				})
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'rf-new' }), { status: 200 }))
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						requestId: 'req-1',
						invoiceLinks: { signUpAndPay: 'https://pay.example/full' }
					}),
					{ status: 200 }
				)
			);
		vi.stubGlobal('fetch', fetchMock);

		const result = await generateRfInvoice({ WORKSPACE: {} } as Env, claims, 'inv-1', {
			chain: 'mainnet',
			settlementCurrencies: ['USDC-mainnet'],
			receivingWalletAddress: '0xabc'
		});

		expect(result.reused).toBe(false);
		expect(result.paymentLink).toBe('https://pay.example/full');
		expect(updateInvoiceNote).toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
});
