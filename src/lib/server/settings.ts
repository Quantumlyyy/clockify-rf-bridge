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

export function resolveRfClientId(settings: WorkspaceSettings, clockifyClientId: string): string {
	const entry = settings.clientMap?.[clockifyClientId];
	if (!entry?.rfClientId) {
		throw new BadRequestError(
			`No Request Finance client mapped for Clockify client ${clockifyClientId}. Update add-on settings.`
		);
	}
	return entry.rfClientId;
}
