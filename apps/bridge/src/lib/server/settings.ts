import {
	getClientMapping,
	upsertClientMappings,
	type UpsertClientMappingPayload
} from '@clockify-rf-bridge/workspace-store';
import { getSettings } from './clients/clockify';
import type { WorkspaceSettings } from './types/clockify';
import { BadRequestError } from './errors';

const SETTINGS_CACHE_TTL = 300;

/** Clockify structured settings may store object/array fields as TXT strings. */
export function normalizeWorkspaceSettings(raw: WorkspaceSettings): WorkspaceSettings {
	const settings: WorkspaceSettings = { ...raw };

	if (typeof settings.clientMap === 'string') {
		const trimmed = settings.clientMap.trim();
		if (!trimmed) {
			settings.clientMap = {};
		} else {
			try {
				settings.clientMap = JSON.parse(trimmed) as WorkspaceSettings['clientMap'];
			} catch {
				settings.clientMap = {};
			}
		}
	}

	if (typeof settings.defaultSettlementCurrencies === 'string') {
		settings.defaultSettlementCurrencies = settings.defaultSettlementCurrencies
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);
	}

	return settings;
}

export async function loadWorkspaceSettings(
	backendUrl: string,
	workspaceId: string,
	installToken: string,
	env: Env
): Promise<WorkspaceSettings> {
	const cacheKey = `settings:${workspaceId}`;
	const cached = await env.cache.get<WorkspaceSettings>(cacheKey, 'json');
	if (cached) return normalizeWorkspaceSettings(cached);

	const settings = normalizeWorkspaceSettings(
		await getSettings({ backendUrl, installToken }, workspaceId)
	);
	await env.cache.put(cacheKey, JSON.stringify(settings), { expirationTtl: SETTINGS_CACHE_TTL });
	return settings;
}

export function isRfClientMappingUiEnabled(env: Env): boolean {
	return String(env.RF_CLIENT_MAPPING_UI).toLowerCase() === 'true';
}

function legacyRfClientId(
	settings: WorkspaceSettings,
	clockifyClientId: string
): string | undefined {
	const clientMap = settings.clientMap;
	if (!clientMap || typeof clientMap === 'string') return undefined;
	const entry = clientMap[clockifyClientId];
	return entry?.rfClientId;
}

/** Resolve Clockify client → RF client id. DO first; legacy Clockify JSON when UI flag is off. */
export async function resolveRfClientId(
	env: Env,
	workspaceId: string,
	settings: WorkspaceSettings,
	clockifyClientId: string
): Promise<string> {
	const doMapping = await getClientMapping(env, workspaceId, clockifyClientId);
	if (doMapping?.rf_client_id) return doMapping.rf_client_id;

	if (!isRfClientMappingUiEnabled(env)) {
		const legacy = legacyRfClientId(settings, clockifyClientId);
		if (legacy) return legacy;
	}

	throw new BadRequestError(
		`No Request Finance client mapped for Clockify client ${clockifyClientId}. ` +
			(isRfClientMappingUiEnabled(env)
				? 'Open Client mapping in the add-on sidebar.'
				: 'Update the clientMap JSON in add-on settings, or enable the mapping UI.')
	);
}

/** Import legacy Clockify clientMap JSON into the workspace DO (best-effort). */
export async function syncLegacyClientMapToDo(
	env: Env,
	workspaceId: string,
	settings: WorkspaceSettings
): Promise<void> {
	const map = settings.clientMap;
	if (!map || typeof map === 'string') return;

	const payloads: UpsertClientMappingPayload[] = [];
	for (const [clockifyClientId, entry] of Object.entries(map)) {
		if (!entry?.rfClientId) continue;
		const existing = await getClientMapping(env, workspaceId, clockifyClientId);
		if (existing) continue;
		payloads.push({
			clockify_client_id: clockifyClientId,
			rf_client_id: entry.rfClientId
		});
	}

	if (payloads.length) {
		await upsertClientMappings(env, workspaceId, payloads);
	}
}
