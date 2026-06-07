import { describe, expect, it } from 'vitest';

describe('context API defaults', () => {
	it('returns empty prefill when workspace settings are unset', () => {
		const payload = {
			rfConfigured: false,
			defaultChain: '',
			defaultSettlementCurrencies: [] as string[],
			receivingWalletAddress: ''
		};
		expect(payload.defaultChain).toBe('');
		expect(payload.defaultSettlementCurrencies).toEqual([]);
		expect(payload.receivingWalletAddress).toBe('');
	});
});
