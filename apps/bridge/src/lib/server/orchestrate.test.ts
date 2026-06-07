import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ClockifyClaims } from './auth';

const claims: ClockifyClaims = {
	backendUrl: 'https://api.clockify.me/api',
	workspaceId: 'ws-1'
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

import { getMapping } from '@clockify-rf-bridge/workspace-store';
import { getInstallToken } from './clients/clockify';
import { getRfToken } from './rf-token';
import { loadWorkspaceSettings } from './settings';
import { generateRfInvoice } from './orchestrate';

describe('orchestrate', () => {
	beforeEach(() => {
		vi.mocked(getMapping).mockReset();
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
});
