import { verifyClockifyJwtFromRequest } from '$lib/server/auth';
import { jsonError } from '$lib/server/errors';
import { listInvoicingCurrencies } from '$lib/server/rf-currencies';

export async function GET({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		await verifyClockifyJwtFromRequest(request, platform.env);
		const currencies = await listInvoicingCurrencies(platform.env.cache);
		return Response.json({ currencies });
	} catch (error) {
		return jsonError(error);
	}
}
