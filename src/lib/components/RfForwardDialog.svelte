<script lang="ts">
	import {
		chainForSelectedCurrencies,
		type RfCurrency
	} from '$lib/rf-currencies';

	interface Props {
		open: boolean;
		authToken: string;
		chain: string;
		wallet: string;
		selectedCurrencyIds: string[];
		submitting?: boolean;
		rfConfigured?: boolean;
		onconfirm?: (detail: {
			chain: string;
			wallet: string;
			settlementCurrencies: string[];
		}) => void;
		oncancel?: () => void;
	}

	let {
		open = false,
		authToken = '',
		chain = $bindable(''),
		wallet = $bindable(''),
		selectedCurrencyIds = $bindable([] as string[]),
		submitting = false,
		rfConfigured = true,
		onconfirm,
		oncancel
	}: Props = $props();

	let currencies = $state<RfCurrency[]>([]);
	let currenciesLoading = $state(false);
	let currenciesError = $state<string | null>(null);
	let currencyFilter = $state('');
	let currenciesRequestId = 0;

	const inferredChain = $derived(chainForSelectedCurrencies(selectedCurrencyIds, currencies));
	const chainMismatch = $derived(selectedCurrencyIds.length > 1 && inferredChain === null);
	const visibleCurrencies = $derived(
		currencies.filter((currency) => {
			const q = currencyFilter.trim().toLowerCase();
			if (!q) return true;
			return (
				currency.label.toLowerCase().includes(q) || currency.id.toLowerCase().includes(q)
			);
		})
	);

	async function loadCurrencies() {
		if (!authToken) return;
		const requestId = ++currenciesRequestId;
		currenciesLoading = true;
		currenciesError = null;
		try {
			const res = await fetch('/api/rf-currencies', {
				headers: { Authorization: `Bearer ${authToken}` }
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data.error ?? 'Failed to load currencies');
			}
			const data = (await res.json()) as { currencies: RfCurrency[] };
			if (requestId !== currenciesRequestId) return;
			currencies = data.currencies;
		} catch (error) {
			if (requestId !== currenciesRequestId) return;
			currenciesError = error instanceof Error ? error.message : 'Failed to load currencies';
		} finally {
			if (requestId === currenciesRequestId) currenciesLoading = false;
		}
	}

	$effect(() => {
		if (open && authToken) {
			loadCurrencies();
		}
	});

	function toggleCurrency(id: string, checked: boolean) {
		if (checked) {
			if (!selectedCurrencyIds.includes(id)) {
				selectedCurrencyIds = [...selectedCurrencyIds, id];
			}
		} else {
			selectedCurrencyIds = selectedCurrencyIds.filter((c) => c !== id);
		}
		if (!chain.trim() && selectedCurrencyIds.length) {
			const auto = chainForSelectedCurrencies(selectedCurrencyIds, currencies);
			if (auto) chain = auto;
		}
	}

	function handleConfirm() {
		const resolvedChain = chain.trim() || inferredChain || '';
		onconfirm?.({
			chain: resolvedChain,
			wallet: wallet.trim(),
			settlementCurrencies: [...selectedCurrencyIds]
		});
	}
</script>

{#if open}
	<div class="backdrop" role="presentation">
		<dialog class="dialog" open aria-labelledby="rf-dialog-title">
			<h2 id="rf-dialog-title">Send to Request Finance</h2>
			<p class="hint">Adjust payment options or continue with your workspace defaults.</p>

			{#if !rfConfigured}
				<p class="warn">Configure the Request Finance API token in add-on settings first.</p>
			{/if}

			<fieldset class="currencies">
				<legend>Settlement currencies</legend>
				<input
					type="search"
					class="currency-search"
					placeholder="Filter currencies…"
					bind:value={currencyFilter}
					autocomplete="off"
				/>
				{#if currenciesLoading}
					<p class="hint">Loading currencies…</p>
				{:else if currenciesError}
					<p class="warn">{currenciesError}</p>
				{:else}
					<div class="currency-grid">
						{#each visibleCurrencies as currency (currency.id)}
							<label class="currency-option">
								<input
									type="checkbox"
									checked={selectedCurrencyIds.includes(currency.id)}
									onchange={(e) =>
										toggleCurrency(
											currency.id,
											(e.currentTarget as HTMLInputElement).checked
										)}
								/>
								{currency.label}
							</label>
						{:else}
							<p class="hint">No currencies match your filter.</p>
						{/each}
					</div>
				{/if}
			</fieldset>

			{#if chainMismatch}
				<p class="warn">Selected currencies use different networks — set chain manually below.</p>
			{/if}

			<label>
				Chain
				<input
					bind:value={chain}
					placeholder={inferredChain ?? 'e.g. mainnet'}
					autocomplete="off"
				/>
			</label>

			<label>
				Receiving wallet
				<input bind:value={wallet} placeholder="0x…" autocomplete="off" />
			</label>

			<div class="actions">
				<button type="button" class="secondary" disabled={submitting} onclick={() => oncancel?.()}>
					Cancel
				</button>
				<button
					type="button"
					class="primary"
					disabled={submitting || !rfConfigured || currenciesLoading}
					onclick={handleConfirm}
				>
					{submitting ? 'Sending…' : 'Send to Request Finance'}
				</button>
			</div>
		</dialog>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 45%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 100;
	}
	.dialog {
		font-family: system-ui, sans-serif;
		border: none;
		border-radius: 8px;
		padding: 1.25rem;
		max-width: 26rem;
		width: 100%;
		max-height: 90vh;
		overflow: auto;
		margin: 0;
		box-shadow: 0 8px 32px rgb(0 0 0 / 20%);
	}
	.hint {
		color: #555;
		font-size: 0.9rem;
		margin: 0 0 1rem;
	}
	.warn {
		color: #a60;
		font-size: 0.9rem;
	}
	fieldset {
		border: 1px solid #ddd;
		border-radius: 6px;
		margin: 0 0 1rem;
		padding: 0.75rem;
	}
	legend {
		font-weight: 600;
		padding: 0 0.25rem;
	}
	.currency-search {
		width: 100%;
		padding: 0.4rem 0.5rem;
		margin-bottom: 0.5rem;
		box-sizing: border-box;
	}
	.currency-grid {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-height: 10rem;
		overflow-y: auto;
	}
	.currency-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		cursor: pointer;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		font-size: 0.9rem;
	}
	input:not([type='checkbox']):not([type='search']) {
		padding: 0.5rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}
	button {
		padding: 0.5rem 1rem;
		cursor: pointer;
		border-radius: 4px;
		border: 1px solid #ccc;
	}
	.primary {
		background: #111;
		color: #fff;
		border-color: #111;
	}
	.secondary {
		background: #fff;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
