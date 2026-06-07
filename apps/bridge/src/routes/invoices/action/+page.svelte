<script lang="ts">
	import { onMount } from 'svelte';
	import RfForwardDialog from '$lib/components/RfForwardDialog.svelte';
	import { refreshAddonToken, toastrPop } from '$lib/clockify-messaging';

	let authToken = $state('');
	let invoiceId = $state('');
	let loading = $state(true);
	let submitting = $state(false);
	let dialogOpen = $state(false);

	let chain = $state('');
	let wallet = $state('');
	let selectedCurrencyIds = $state<string[]>([]);
	let rfConfigured = $state(false);

	async function loadContext() {
		const res = await fetch('/api/context', {
			headers: { Authorization: `Bearer ${authToken}` }
		});
		if (res.status === 401) {
			refreshAddonToken();
			return;
		}
		if (!res.ok) return;
		const data = (await res.json()) as {
			rfConfigured: boolean;
			defaultChain: string;
			defaultSettlementCurrencies: string[];
			receivingWalletAddress: string;
		};
		rfConfigured = data.rfConfigured;
		if (data.defaultChain) chain = data.defaultChain;
		if (data.defaultSettlementCurrencies.length) {
			selectedCurrencyIds = [...data.defaultSettlementCurrencies];
		}
		if (data.receivingWalletAddress) wallet = data.receivingWalletAddress;
	}

	async function sendToRf(detail: {
		chain: string;
		wallet: string;
		settlementCurrencies: string[];
	}) {
		if (!invoiceId) {
			toastrPop('error', 'No invoice selected');
			return;
		}
		if (!rfConfigured) {
			toastrPop('warning', 'Configure Request Finance API token in add-on settings first');
			return;
		}
		if (!detail.chain) {
			toastrPop('warning', 'Select currencies on the same network or enter a chain');
			return;
		}
		if (!detail.settlementCurrencies.length) {
			toastrPop('warning', 'Select at least one settlement currency');
			return;
		}
		if (!detail.wallet) {
			toastrPop('warning', 'Enter the receiving wallet address');
			return;
		}

		submitting = true;
		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					invoiceId,
					chain: detail.chain,
					settlementCurrencies: detail.settlementCurrencies,
					receivingWalletAddress: detail.wallet
				})
			});

			if (res.status === 401) {
				refreshAddonToken();
				return;
			}

			const data = (await res.json()) as {
				paymentLink?: string;
				reused?: boolean;
				error?: string;
			};

			if (!res.ok) {
				toastrPop('error', data.error ?? 'Failed to create Request Finance invoice');
				return;
			}

			dialogOpen = false;
			const msg = data.reused
				? 'Existing Request Finance payment link added to invoice note'
				: 'Request Finance invoice created — payment link added to invoice note';
			toastrPop('success', msg);
		} catch {
			toastrPop('error', 'Network error — try again');
		} finally {
			submitting = false;
		}
	}

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		authToken = params.get('auth_token') ?? '';
		invoiceId = params.get('invoiceId') ?? '';
		await loadContext();
		loading = false;
		if (invoiceId) dialogOpen = true;
	});
</script>

<main class="page">
	{#if loading}
		<p>Loading…</p>
	{:else if !invoiceId}
		<p class="warn-text">No invoice selected.</p>
	{:else}
		<p class="hint">Preparing Request Finance export…</p>
	{/if}
</main>

<RfForwardDialog
	bind:open={dialogOpen}
	authToken={authToken}
	bind:chain
	bind:wallet
	bind:selectedCurrencyIds
	{submitting}
	{rfConfigured}
	onconfirm={sendToRf}
	oncancel={() => {
		dialogOpen = false;
		toastrPop('info', 'Cancelled');
	}}
/>
