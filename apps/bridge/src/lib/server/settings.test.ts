import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	isRfClientMappingUiEnabled,
	normalizeWorkspaceSettings,
	resolveRfClientId,
	syncLegacyClientMapToDo
} from './settings';

vi.mock('@clockify-rf-bridge/workspace-store', () => ({
	getClientMapping: vi.fn(),
	upsertClientMappings: vi.fn()
}));

import { getClientMapping, upsertClientMappings } from '@clockify-rf-bridge/workspace-store';

const env = { RF_CLIENT_MAPPING_UI: 'false' } as unknown as Env;

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

describe('isRfClientMappingUiEnabled', () => {
	it('is true only when env flag is true', () => {
		expect(isRfClientMappingUiEnabled({ RF_CLIENT_MAPPING_UI: 'true' } as unknown as Env)).toBe(
			true
		);
		expect(isRfClientMappingUiEnabled({ RF_CLIENT_MAPPING_UI: 'false' } as unknown as Env)).toBe(
			false
		);
	});
});

describe('resolveRfClientId', () => {
	beforeEach(() => {
		vi.mocked(getClientMapping).mockReset();
	});

	it('prefers DO mapping', async () => {
		vi.mocked(getClientMapping).mockResolvedValue({
			clockify_client_id: 'clk-1',
			rf_client_id: 'rf-do',
			rf_client_label: null,
			clockify_client_name: null,
			updated_at: '2024-01-01'
		});

		const id = await resolveRfClientId(env, 'ws-1', {}, 'clk-1');
		expect(id).toBe('rf-do');
	});

	it('falls back to legacy clientMap when UI flag is off', async () => {
		vi.mocked(getClientMapping).mockResolvedValue(null);

		const id = await resolveRfClientId(
			env,
			'ws-1',
			{ clientMap: { 'clk-1': { rfClientId: 'rf-legacy' } } },
			'clk-1'
		);
		expect(id).toBe('rf-legacy');
	});

	it('throws when no mapping exists', async () => {
		vi.mocked(getClientMapping).mockResolvedValue(null);

		await expect(resolveRfClientId(env, 'ws-1', {}, 'clk-missing')).rejects.toThrow(
			/No Request Finance client mapped/
		);
	});
});

describe('syncLegacyClientMapToDo', () => {
	beforeEach(() => {
		vi.mocked(getClientMapping).mockReset();
		vi.mocked(upsertClientMappings).mockReset();
	});

	it('imports new legacy entries into DO', async () => {
		vi.mocked(getClientMapping).mockResolvedValue(null);

		await syncLegacyClientMapToDo(env, 'ws-1', {
			clientMap: { 'clk-1': { rfClientId: 'rf-1' } }
		});

		expect(upsertClientMappings).toHaveBeenCalledWith(env, 'ws-1', [
			{ clockify_client_id: 'clk-1', rf_client_id: 'rf-1' }
		]);
	});

	it('skips entries already present in DO', async () => {
		vi.mocked(getClientMapping).mockResolvedValue({
			clockify_client_id: 'clk-1',
			rf_client_id: 'rf-existing',
			rf_client_label: null,
			clockify_client_name: null,
			updated_at: '2024-01-01'
		});

		await syncLegacyClientMapToDo(env, 'ws-1', {
			clientMap: { 'clk-1': { rfClientId: 'rf-1' } }
		});

		expect(upsertClientMappings).not.toHaveBeenCalled();
	});
});
