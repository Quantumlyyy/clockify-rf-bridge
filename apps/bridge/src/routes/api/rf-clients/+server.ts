import { Effect } from 'effect';
import {
	RequestFinanceClient,
	RequestFinanceClientLive
} from '@clockify-rf-bridge/request-finance';
import { verifyClockifyJwtFromRequest, requireAdmin } from '$lib/server/auth';
import { jsonError } from '$lib/server/errors';
import { getRfToken } from '$lib/server/rf-token';
import { isRfClientMappingUiEnabled } from '$lib/server/settings';

export async function GET({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const claims = await verifyClockifyJwtFromRequest(request, platform.env);
		requireAdmin(claims);

		if (!isRfClientMappingUiEnabled(platform.env)) {
			return Response.json(
				{
					available: false,
					reason:
						'RF client list requires RF_CLIENT_MAPPING_UI=true and OAuth access to the RF /clients API.'
				},
				{ status: 403 }
			);
		}

		const apiKey = await getRfToken(claims.workspaceId, platform.env);

		try {
			const clients = await Effect.runPromise(
				Effect.gen(function* () {
					const rf = yield* RequestFinanceClient;
					return yield* rf.listClients(apiKey, { take: 100 });
				}).pipe(Effect.provide(RequestFinanceClientLive))
			);

			return Response.json({
				available: true,
				clients: clients.map((c) => ({
					id: c.id,
					label:
						c.businessName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id
				}))
			});
		} catch (rfError) {
			return Response.json(
				{
					available: false,
					reason:
						'RF /clients API unavailable — likely needs OAuth token approval from Request Finance.',
					detail: String(rfError)
				},
				{ status: 502 }
			);
		}
	} catch (error) {
		return jsonError(error);
	}
}
