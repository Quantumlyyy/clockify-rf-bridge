import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetPublicKeyCacheForTests, setVerificationKeyForTests } from '$lib/server/auth';
import { CLOCKIFY_JWT_ISSUER, CLOCKIFY_JWT_TYPE } from '$lib/server/config';

vi.mock('$lib/server/clients/clockify', () => ({
	getInstallToken: vi.fn(async () => 'install-token')
}));

vi.mock('$lib/server/workspace/tokens', () => ({
	hasEncryptedToken: vi.fn(async () => false)
}));

vi.mock('$lib/server/settings', () => ({
	loadWorkspaceSettings: vi.fn(async () => ({
		defaultChain: 'mainnet',
		defaultSettlementCurrencies: ['USDC-mainnet'],
		receivingWalletAddress: '0xabc'
	}))
}));

import { GET } from './+server';
import { hasEncryptedToken } from '$lib/server/workspace/tokens';
import { loadWorkspaceSettings } from '$lib/server/settings';

const ADDON_KEY = 'clockify-rf-bridge';

async function userToken(privateKey: CryptoKey): Promise<string> {
	return new SignJWT({
		type: CLOCKIFY_JWT_TYPE,
		backendUrl: 'https://api.clockify.me/api',
		workspaceId: 'ws-1',
		user: { admin: false }
	})
		.setProtectedHeader({ alg: 'RS256' })
		.setIssuer(CLOCKIFY_JWT_ISSUER)
		.setSubject(ADDON_KEY)
		.setExpirationTime('2h')
		.sign(privateKey);
}

describe('GET /api/context', () => {
	afterEach(() => {
		resetPublicKeyCacheForTests();
		vi.clearAllMocks();
	});

	it('returns workspace settings prefill and rfConfigured flag', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		vi.mocked(hasEncryptedToken).mockResolvedValue(true);

		const res = await GET({
			request: new Request('https://bridge/api/context', {
				headers: { Authorization: `Bearer ${await userToken(pair.privateKey)}` }
			}),
			platform: { env: { ADDON_KEY } as unknown as Env }
		} as Parameters<typeof GET>[0]);

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			rfConfigured: boolean;
			defaultChain: string;
			defaultSettlementCurrencies: string[];
			receivingWalletAddress: string;
		};
		expect(body.rfConfigured).toBe(true);
		expect(body.defaultChain).toBe('mainnet');
		expect(body.defaultSettlementCurrencies).toEqual(['USDC-mainnet']);
		expect(body.receivingWalletAddress).toBe('0xabc');
		expect(loadWorkspaceSettings).toHaveBeenCalled();
	});
});
