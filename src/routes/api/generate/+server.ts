import { verifyClockifyJwtFromRequest } from '$lib/server/auth';
import { jsonError } from '$lib/server/errors';
import { generateRfInvoice } from '$lib/server/orchestrate';

export async function POST({ request, platform }: { request: Request; platform: App.Platform }) {
	try {
		const claims = await verifyClockifyJwtFromRequest(request, platform.env);
		const body = (await request.json()) as {
			invoiceId?: string;
			chain?: string;
			settlementCurrencies?: string[];
			receivingWalletAddress?: string;
		};

		if (!body.invoiceId) {
			return Response.json({ error: 'invoiceId is required' }, { status: 400 });
		}
		if (!body.chain?.trim()) {
			return Response.json({ error: 'chain is required' }, { status: 400 });
		}
		const settlementCurrencies = body.settlementCurrencies?.map((c) => c.trim()).filter(Boolean);
		if (!settlementCurrencies?.length) {
			return Response.json({ error: 'settlementCurrencies is required' }, { status: 400 });
		}
		if (!body.receivingWalletAddress?.trim()) {
			return Response.json({ error: 'receivingWalletAddress is required' }, { status: 400 });
		}

		const result = await generateRfInvoice(platform.env, claims, body.invoiceId, {
			chain: body.chain.trim(),
			settlementCurrencies,
			receivingWalletAddress: body.receivingWalletAddress.trim()
		});

		return Response.json(result);
	} catch (error) {
		return jsonError(error);
	}
}
