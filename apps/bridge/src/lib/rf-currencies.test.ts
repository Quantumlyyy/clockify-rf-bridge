import { describe, expect, it } from 'vitest';
import { chainForSelectedCurrencies, resolveChain, type RfCurrency } from './rf-currencies';

const FIXTURE: RfCurrency[] = [
	{ id: 'USDC-mainnet', chain: 'mainnet', label: 'USDC — mainnet' },
	{ id: 'USDT-mainnet', chain: 'mainnet', label: 'USDT — mainnet' },
	{ id: 'USDC-matic', chain: 'matic', label: 'USDC — matic' }
];

describe('rf-currencies', () => {
	it('infers chain when all currencies share a network', () => {
		expect(chainForSelectedCurrencies(['USDC-mainnet', 'USDT-mainnet'], FIXTURE)).toBe('mainnet');
	});

	it('returns null when currencies span networks', () => {
		expect(chainForSelectedCurrencies(['USDC-mainnet', 'USDC-matic'], FIXTURE)).toBeNull();
	});

	it('resolveChain prefers explicit input', () => {
		expect(resolveChain('custom', ['USDC-mainnet'], FIXTURE)).toBe('custom');
	});
});
