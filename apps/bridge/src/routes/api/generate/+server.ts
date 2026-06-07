import { verifyClockifyJwtFromRequest } from '$lib/server/auth';
import { BadRequestError, jsonError } from '$lib/server/errors';
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
			throw new BadRequestError('invoiceId is required');
		}
		if (!body.chain?.trim()) {
			throw new BadRequestError('chain is required');
		}
		const settlementCurrencies = body.settlementCurrencies?.map((c) => c.trim()).filter(Boolean);
		if (!settlementCurrencies?.length) {
			throw new BadRequestError('settlementCurrencies is required');
		}
		if (!body.receivingWalletAddress?.trim()) {
			throw new BadRequestError('receivingWalletAddress is required');
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
