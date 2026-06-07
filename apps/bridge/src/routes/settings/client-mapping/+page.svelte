<script lang="ts">
	import { onMount } from 'svelte';
	import { refreshAddonToken, toastrPop } from '$lib/clockify-messaging';

	type ClockifyClient = { id: string; name: string; email?: string };
	type RfClientOption = { id: string; label: string };
	type ClientMapping = {
		clockify_client_id: string;
		rf_client_id: string;
		rf_client_label?: string | null;
		clockify_client_name?: string | null;
	};

	type RowState = {
		clockifyClientId: string;
		clockifyClientName: string;
		rfClientId: string;
		rfClientLabel: string;
	};

	let authToken = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let uiEnabled = $state(false);
	let rfClientsAvailable = $state(false);
	let rfClientsReason = $state('');
	let rfClients = $state<RfClientOption[]>([]);
	let rows = $state<RowState[]>([]);

	function authHeaders(): HeadersInit {
		return { Authorization: `Bearer ${authToken}` };
	}

	async function load() {
		if (!authToken) return;

		const [mappingsRes, clockifyRes, rfRes] = await Promise.all([
			fetch('/api/client-mappings', { headers: authHeaders() }),
			fetch('/api/clockify-clients', { headers: authHeaders() }),
			fetch('/api/rf-clients', { headers: authHeaders() })
		]);

		if ([mappingsRes, clockifyRes].some((r) => r.status === 401)) {
			refreshAddonToken();
			return;
		}

		if (!mappingsRes.ok || !clockifyRes.ok) {
			toastrPop('error', 'Failed to load client mapping data');
			return;
		}

		const mappingsData = (await mappingsRes.json()) as {
			mappings: ClientMapping[];
			uiEnabled: boolean;
		};
		const clockifyData = (await clockifyRes.json()) as { clients: ClockifyClient[] };

		uiEnabled = mappingsData.uiEnabled;
		const mappingByClockify = new Map(
			mappingsData.mappings.map((m) => [m.clockify_client_id, m])
		);

		rows = clockifyData.clients.map((client) => {
			const existing = mappingByClockify.get(client.id);
			return {
				clockifyClientId: client.id,
				clockifyClientName: client.name,
				rfClientId: existing?.rf_client_id ?? '',
				rfClientLabel: existing?.rf_client_label ?? ''
			};
		});

		if (rfRes.ok) {
			const rfData = (await rfRes.json()) as {
				available: boolean;
				clients?: RfClientOption[];
				reason?: string;
			};
			rfClientsAvailable = rfData.available;
			rfClients = rfData.clients ?? [];
			rfClientsReason = rfData.reason ?? '';
		} else {
			const rfData = (await rfRes.json()) as { reason?: string };
			rfClientsAvailable = false;
			rfClientsReason = rfData.reason ?? 'RF client list unavailable';
		}
	}

	async function save() {
		if (!uiEnabled) {
			toastrPop(
				'warning',
				'Mapping UI is disabled — use the legacy clientMap JSON in Clockify add-on settings.'
			);
			return;
		}

		saving = true;
		try {
			const mappings = rows
				.filter((row) => row.rfClientId.trim())
				.map((row) => ({
					clockify_client_id: row.clockifyClientId,
					clockify_client_name: row.clockifyClientName,
					rf_client_id: row.rfClientId.trim(),
					rf_client_label: row.rfClientLabel.trim() || null
				}));

			const res = await fetch('/api/client-mappings', {
				method: 'PUT',
				headers: { ...authHeaders(), 'Content-Type': 'application/json' },
				body: JSON.stringify({ mappings })
			});

			if (res.status === 401) {
				refreshAddonToken();
				return;
			}
			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				toastrPop('error', err.error ?? 'Failed to save mappings');
				return;
			}
			toastrPop('success', 'Client mappings saved');
			await load();
		} finally {
			saving = false;
		}
	}

	function onRfSelect(row: RowState, rfId: string) {
		row.rfClientId = rfId;
		const match = rfClients.find((c) => c.id === rfId);
		if (match) row.rfClientLabel = match.label;
	}

	onMount(async () => {
		authToken = new URLSearchParams(window.location.search).get('auth_token') ?? '';
		await load();
		loading = false;
	});
</script>

<main class="page page-wide">
	<h1>Client mapping</h1>
	<p class="intro">
		Map each Clockify client to a Request Finance client used when creating invoices.
	</p>

	{#if loading}
		<p>Loading…</p>
	{:else if !uiEnabled}
		<p class="banner">
			The mapping UI is behind <code>RF_CLIENT_MAPPING_UI</code>. Until Request Finance grants OAuth
			access to the <a href="https://docs.request.finance/clients">/clients API</a>, configure mappings
			via the legacy <strong>clientMap</strong> JSON field in Clockify add-on settings. Existing DO
			mappings below are still used for invoice generation.
		</p>
	{:else if !rfClientsAvailable}
		<p class="banner banner-warning">
			RF client picker unavailable: {rfClientsReason} Enter RF client IDs manually for now.
		</p>
	{/if}

	{#if rows.length === 0}
		<p>No Clockify clients found in this workspace.</p>
	{:else}
		<table class="data-table">
			<thead>
				<tr>
					<th>Clockify client</th>
					<th>Request Finance client</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.clockifyClientId)}
					<tr>
						<td>
							<strong>{row.clockifyClientName}</strong>
							<div class="muted">{row.clockifyClientId}</div>
						</td>
						<td>
							{#if uiEnabled && rfClientsAvailable}
								<select
									value={row.rfClientId}
									onchange={(e) =>
										onRfSelect(row, (e.currentTarget as HTMLSelectElement).value)}
								>
									<option value="">— Select RF client —</option>
									{#each rfClients as rf (rf.id)}
										<option value={rf.id}>{rf.label}</option>
									{/each}
								</select>
							{:else}
								<input
									type="text"
									placeholder="RF client ID"
									bind:value={row.rfClientId}
									readonly={!uiEnabled}
								/>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if uiEnabled}
			<button type="button" class="btn btn-primary" disabled={saving} onclick={save}>
				{saving ? 'Saving…' : 'Save mappings'}
			</button>
		{/if}
	{/if}
</main>
