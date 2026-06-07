<script lang="ts">
	import { onMount } from 'svelte';
	import { refreshAddonToken, toastrPop } from '$lib/clockify-messaging';

	let authToken = $state('');
	let tokenInput = $state('');
	let configured = $state(false);
	let saving = $state(false);
	let loading = $state(true);

	async function loadStatus() {
		if (!authToken) return;
		const res = await fetch('/api/rf-token', {
			headers: { Authorization: `Bearer ${authToken}` }
		});
		if (res.status === 401) {
			refreshAddonToken();
			return;
		}
		if (!res.ok) {
			toastrPop('error', 'Failed to load configuration status');
			return;
		}
		const data = (await res.json()) as { configured: boolean };
		configured = data.configured;
	}

	async function saveToken() {
		if (!tokenInput.trim()) {
			toastrPop('warning', 'Enter your Request Finance API token');
			return;
		}
		saving = true;
		try {
			const res = await fetch('/api/rf-token', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token: tokenInput })
			});
			if (res.status === 401) {
				refreshAddonToken();
				return;
			}
			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				toastrPop('error', err.error ?? 'Failed to save token');
				return;
			}
			tokenInput = '';
			configured = true;
			toastrPop('success', 'Request Finance API token saved');
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		authToken = new URLSearchParams(window.location.search).get('auth_token') ?? '';
		await loadStatus();
		loading = false;
	});
</script>

<main>
	<h1>Request Finance API token</h1>
	{#if loading}
		<p>Loading…</p>
	{:else if configured}
		<p class="status">Token is configured. Enter a new value below to replace it.</p>
	{/if}
	<label>
		API token
		<input type="password" bind:value={tokenInput} autocomplete="off" placeholder="RF API key" />
	</label>
	<button type="button" disabled={saving} onclick={saveToken}>
		{saving ? 'Saving…' : 'Save token'}
	</button>
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		padding: 1rem;
		max-width: 28rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 1rem 0;
	}
	input {
		padding: 0.5rem;
	}
	button {
		padding: 0.5rem 1rem;
		cursor: pointer;
	}
	.status {
		color: #0a0;
	}
</style>
