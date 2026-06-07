import { describe, expect, it } from 'vitest';
import { isSettlementCurrency, mapToRfCurrency, parseInvoicingCurrencies } from './rf-currencies';

describe('rf-currencies server', () => {
	it('excludes fiat, testnets, and items without a network', () => {
		expect(
			isSettlementCurrency({
				id: 'USD',
				symbol: 'USD',
				type: 'ISO4217'
			})
		).toBe(false);
		expect(
			isSettlementCurrency({
				id: 'USDC-sepolia',
				symbol: 'USDC',
				network: 'sepolia',
				type: 'ERC20',
				meta: { isTestnet: true }
			})
		).toBe(false);
		expect(
			isSettlementCurrency({
				id: 'USDC-solana-devnet',
				symbol: 'USDC',
				network: 'solana-devnet',
				type: 'ERC20'
			})
		).toBe(false);
		expect(
			isSettlementCurrency({
				id: 'USDC-mainnet',
				symbol: 'USDC',
				network: 'mainnet',
				type: 'ERC20'
			})
		).toBe(true);
	});

	it('maps API items to picker rows', () => {
		expect(
			mapToRfCurrency({
				id: 'USDCn-matic',
				symbol: 'USDC',
				network: 'matic',
				type: 'ERC20'
			})
		).toEqual({
			id: 'USDCn-matic',
			chain: 'matic',
			label: 'USDC — matic'
		});
	});

	it('parses and sorts settlement currencies', () => {
		const parsed = parseInvoicingCurrencies([
			{ id: 'USDT-mainnet', symbol: 'USDT', network: 'mainnet', type: 'ERC20' },
			{ id: 'USDC-mainnet', symbol: 'USDC', network: 'mainnet', type: 'ERC20' },
			{ id: 'EUR', symbol: 'EUR', type: 'ISO4217' },
			{
				id: 'ETH-sepolia',
				symbol: 'ETH',
				network: 'sepolia',
				type: 'ETH',
				meta: { isTestnet: true }
			}
		]);
		expect(parsed).toEqual([
			{ id: 'USDC-mainnet', chain: 'mainnet', label: 'USDC — mainnet' },
			{ id: 'USDT-mainnet', chain: 'mainnet', label: 'USDT — mainnet' }
		]);
	});
});
