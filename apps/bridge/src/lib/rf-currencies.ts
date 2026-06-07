/**
 * Request Finance settlement currency IDs (`{symbol}-{network}`).
 * Loaded from GET /api/rf-currencies (proxies RF invoicing currency list).
 * @see https://docs.request.finance/currencies
 */
export interface RfCurrency {
	/** RF API id, e.g. USDC-mainnet */
	id: string;
	/** RF `chain` value for paymentInformation */
	chain: string;
	label: string;
}

export function chainForSelectedCurrencies(ids: string[], currencies: RfCurrency[]): string | null {
	if (!ids.length) return null;
	const byId = new Map(currencies.map((c) => [c.id, c]));
	const chains = new Set(ids.map((id) => byId.get(id)?.chain).filter(Boolean));
	if (chains.size === 1) return [...chains][0] as string;
	return null;
}

export function resolveChain(
	chainInput: string,
	currencyIds: string[],
	currencies: RfCurrency[]
): string | null {
	const trimmed = chainInput.trim();
	if (trimmed) return trimmed;
	return chainForSelectedCurrencies(currencyIds, currencies);
}
