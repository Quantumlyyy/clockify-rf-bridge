import { verifyClockifyJwtFromRequest, requireAdmin } from '$lib/server/auth';
import { getInstallToken, getClients } from '$lib/server/clients/clockify';
import { jsonError } from '$lib/server/errors';

export async function GET({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const claims = await verifyClockifyJwtFromRequest(request, platform.env);
		requireAdmin(claims);
		const installToken = await getInstallToken(platform.env, claims.workspaceId);
		const clients = await getClients(
			{ backendUrl: claims.backendUrl, installToken },
			claims.workspaceId
		);
		return Response.json({ clients });
	} catch (error) {
		return jsonError(error);
	}
}
