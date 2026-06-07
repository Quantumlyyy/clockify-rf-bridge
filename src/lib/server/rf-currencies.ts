import type { RfCurrency } from '$lib/rf-currencies';
import {
	RF_API_BASE,
	RF_CURRENCIES_CACHE_KEY,
	RF_CURRENCIES_CACHE_TTL_SECONDS
} from './config';

export interface RfCurrencyApiItem {
	id: string;
	symbol: string;
	network?: string;
	type: string;
	meta?: { isTestnet?: boolean };
}

const TESTNET_NETWORK = /test|devnet|rinkeby|goerli|sepolia|mumbai|amoy|fuji/i;

export function isSettlementCurrency(item: RfCurrencyApiItem): boolean {
	if (!item.network || item.type === 'ISO4217') return false;
	if (item.meta?.isTestnet) return false;
	if (TESTNET_NETWORK.test(item.network)) return false;
	return true;
}

export function mapToRfCurrency(item: RfCurrencyApiItem): RfCurrency {
	return {
		id: item.id,
		chain: item.network!,
		label: `${item.symbol} — ${item.network}`
	};
}

export function parseInvoicingCurrencies(items: RfCurrencyApiItem[]): RfCurrency[] {
	return items
		.filter(isSettlementCurrency)
		.map(mapToRfCurrency)
		.sort((a, b) => a.label.localeCompare(b.label));
}

export async function listInvoicingCurrencies(cache: KVNamespace): Promise<RfCurrency[]> {
	const cached = await cache.get<RfCurrency[]>(RF_CURRENCIES_CACHE_KEY, 'json');
	if (cached) return cached;

	const res = await fetch(`${RF_API_BASE}/currency/list/invoicing?meta=true`);
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`RF currency list failed (${res.status}): ${text.slice(0, 300)}`);
	}

	const items = (await res.json()) as RfCurrencyApiItem[];
	const currencies = parseInvoicingCurrencies(items);
	await cache.put(RF_CURRENCIES_CACHE_KEY, JSON.stringify(currencies), {
		expirationTtl: RF_CURRENCIES_CACHE_TTL_SECONDS
	});
	return currencies;
}
