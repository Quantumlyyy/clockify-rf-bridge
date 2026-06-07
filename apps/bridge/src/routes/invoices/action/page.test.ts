import { describe, expect, it } from 'vitest';
import { chainForSelectedCurrencies, type RfCurrency } from '$lib/rf-currencies';

const FIXTURE: RfCurrency[] = [
	{ id: 'USDC-mainnet', chain: 'mainnet', label: 'USDC — mainnet' },
	{ id: 'USDC-matic', chain: 'matic', label: 'USDC — matic' }
];

describe('RfForwardDialog chain logic', () => {
	it('detects chain mismatch when currencies span networks', () => {
		const selected = ['USDC-mainnet', 'USDC-matic'];
		const inferred = chainForSelectedCurrencies(selected, FIXTURE);
		expect(inferred).toBeNull();
	});

	it('allows confirm when a single network is selected', () => {
		const selected = ['USDC-mainnet'];
		expect(chainForSelectedCurrencies(selected, FIXTURE)).toBe('mainnet');
	});
});
