import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetPublicKeyCacheForTests, setVerificationKeyForTests } from '$lib/server/auth';
import { CLOCKIFY_JWT_ISSUER, CLOCKIFY_JWT_TYPE } from '$lib/server/config';

vi.mock('$lib/server/orchestrate', () => ({
	generateRfInvoice: vi.fn()
}));

import { POST } from './+server';
import { generateRfInvoice } from '$lib/server/orchestrate';

const ADDON_KEY = 'clockify-rf-bridge';

async function userToken(privateKey: CryptoKey): Promise<string> {
	return new SignJWT({
		type: CLOCKIFY_JWT_TYPE,
		backendUrl: 'https://api.clockify.me/api',
		workspaceId: 'ws-1'
	})
		.setProtectedHeader({ alg: 'RS256' })
		.setIssuer(CLOCKIFY_JWT_ISSUER)
		.setSubject(ADDON_KEY)
		.setExpirationTime('2h')
		.sign(privateKey);
}

describe('POST /api/generate', () => {
	afterEach(() => {
		resetPublicKeyCacheForTests();
		vi.clearAllMocks();
	});

	it('returns 400 when invoiceId is missing', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));

		const res = await POST({
			request: new Request('https://bridge/api/generate', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await userToken(pair.privateKey)}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ chain: 'mainnet', settlementCurrencies: ['USDC-mainnet'] })
			}),
			platform: { env: { ADDON_KEY } as unknown as Env }
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
		expect(generateRfInvoice).not.toHaveBeenCalled();
	});

	it('returns result from orchestrate on success', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		vi.mocked(generateRfInvoice).mockResolvedValue({
			paymentLink: 'https://pay.example/new',
			rfInvoiceId: 'rf-1',
			reused: false
		});

		const res = await POST({
			request: new Request('https://bridge/api/generate', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await userToken(pair.privateKey)}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					invoiceId: 'inv-1',
					chain: 'mainnet',
					settlementCurrencies: ['USDC-mainnet'],
					receivingWalletAddress: '0xabc'
				})
			}),
			platform: { env: { ADDON_KEY } as unknown as Env }
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(200);
		const body = (await res.json()) as { paymentLink: string; reused: boolean };
		expect(body.paymentLink).toBe('https://pay.example/new');
		expect(body.reused).toBe(false);
	});
});
