import { requireAdmin, verifyClockifyJwtFromRequest } from '$lib/server/auth';
import { getDb } from '$lib/server/db/index';
import { storeEncryptedToken, hasEncryptedToken } from '$lib/server/db/tokens';
import { jsonError } from '$lib/server/errors';

export async function GET({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const claims = await verifyClockifyJwtFromRequest(request, platform.env);
		requireAdmin(claims);
		const db = getDb(platform.env);
		const configured = await hasEncryptedToken(db, claims.workspaceId, 'rf_api');
		return Response.json({ configured });
	} catch (error) {
		return jsonError(error);
	}
}

export async function POST({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const claims = await verifyClockifyJwtFromRequest(request, platform.env);
		requireAdmin(claims);

		const body = (await request.json()) as { token?: string };
		if (!body.token?.trim()) {
			return Response.json({ error: 'Token is required' }, { status: 400 });
		}

		await storeEncryptedToken(
			getDb(platform.env),
			claims.workspaceId,
			'rf_api',
			body.token.trim(),
			platform.env
		);

		return Response.json({ configured: true });
	} catch (error) {
		return jsonError(error);
	}
}
