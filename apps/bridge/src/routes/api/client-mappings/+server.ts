import { verifyClockifyJwtFromRequest, requireAdmin } from '$lib/server/auth';
import { listClientMappings, upsertClientMappings } from '@clockify-rf-bridge/workspace-store';
import { BadRequestError, ForbiddenError, jsonError } from '$lib/server/errors';
import { isRfClientMappingUiEnabled } from '$lib/server/settings';

export async function GET({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const claims = await verifyClockifyJwtFromRequest(request, platform.env);
		requireAdmin(claims);
		const mappings = await listClientMappings(platform.env, claims.workspaceId);
		return Response.json({
			mappings,
			uiEnabled: isRfClientMappingUiEnabled(platform.env)
		});
	} catch (error) {
		return jsonError(error);
	}
}

export async function PUT({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const claims = await verifyClockifyJwtFromRequest(request, platform.env);
		requireAdmin(claims);

		if (!isRfClientMappingUiEnabled(platform.env)) {
			throw new ForbiddenError(
				'Client mapping UI is disabled. Set RF_CLIENT_MAPPING_UI=true after RF OAuth /clients access is granted.'
			);
		}

		const body = (await request.json()) as {
			mappings?: Array<{
				clockify_client_id: string;
				rf_client_id: string;
				rf_client_label?: string | null;
				clockify_client_name?: string | null;
			}>;
		};

		if (!Array.isArray(body.mappings)) {
			throw new BadRequestError('mappings array is required');
		}

		for (const row of body.mappings) {
			if (!row.clockify_client_id?.trim() || !row.rf_client_id?.trim()) {
				throw new BadRequestError('Each mapping requires clockify_client_id and rf_client_id');
			}
		}

		const saved = await upsertClientMappings(
			platform.env,
			claims.workspaceId,
			body.mappings.map((row) => ({
				clockify_client_id: row.clockify_client_id.trim(),
				rf_client_id: row.rf_client_id.trim(),
				rf_client_label: row.rf_client_label?.trim() || null,
				clockify_client_name: row.clockify_client_name?.trim() || null
			}))
		);

		return Response.json({ mappings: saved });
	} catch (error) {
		return jsonError(error);
	}
}
