import { describe, expect, it } from 'vitest';
import { normalizeWorkspaceSettings } from './settings';

describe('normalizeWorkspaceSettings', () => {
	it('parses clientMap JSON and comma-separated currencies', () => {
		const normalized = normalizeWorkspaceSettings({
			clientMap: '{"clk-1":{"rfClientId":"rf-1"}}',
			defaultSettlementCurrencies: 'USDC-mainnet, USDT-mainnet'
		});
		expect(normalized.clientMap).toEqual({ 'clk-1': { rfClientId: 'rf-1' } });
		expect(normalized.defaultSettlementCurrencies).toEqual(['USDC-mainnet', 'USDT-mainnet']);
	});
});
