import { verifyClockifyJwtFromRequest } from '$lib/server/auth';
import { getInstallToken } from '$lib/server/clients/clockify';
import { hasEncryptedToken } from '$lib/server/db/tokens';
import { jsonError } from '$lib/server/errors';
import { loadWorkspaceSettings } from '$lib/server/settings';

export async function GET({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const claims = await verifyClockifyJwtFromRequest(request, platform.env);
		const installToken = await getInstallToken(
			platform.env.persistence,
			claims.workspaceId,
			platform.env
		);
		const settings = await loadWorkspaceSettings(
			claims.backendUrl,
			claims.workspaceId,
			installToken,
			platform.env
		);
		const rfConfigured = await hasEncryptedToken(
			platform.env.persistence,
			claims.workspaceId,
			'rf_api'
		);

		return Response.json({
			rfConfigured,
			defaultChain: settings.defaultChain ?? '',
			defaultSettlementCurrencies: settings.defaultSettlementCurrencies ?? [],
			receivingWalletAddress: settings.receivingWalletAddress ?? ''
		});
	} catch (error) {
		return jsonError(error);
	}
}
