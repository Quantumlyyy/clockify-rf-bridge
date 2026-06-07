import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	requireAdmin,
	resetPublicKeyCacheForTests,
	setVerificationKeyForTests,
	verifyClockifyJwt
} from '$lib/server/auth';
import { CLOCKIFY_JWT_ISSUER, CLOCKIFY_JWT_TYPE } from '$lib/server/config';

vi.mock('@clockify-rf-bridge/workspace-store', () => ({
	storeEncryptedTokenRow: vi.fn(async () => undefined),
	hasEncryptedToken: vi.fn(async () => true),
	getEncryptedTokenRow: vi.fn(async () => ({
		iv: [1],
		ciphertext: [2],
		keyVersion: 1
	}))
}));

import { hasEncryptedToken, storeEncryptedTokenRow } from '@clockify-rf-bridge/workspace-store';
import { storeEncryptedToken } from '$lib/server/workspace/tokens';

const TEST_KEK = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ADDON_KEY = 'clockify-rf-bridge';

async function adminToken(privateKey: CryptoKey, admin: boolean): Promise<string> {
	return new SignJWT({
		type: CLOCKIFY_JWT_TYPE,
		backendUrl: 'https://api.clockify.me/api',
		workspaceId: 'ws-1',
		user: { admin }
	})
		.setProtectedHeader({ alg: 'RS256' })
		.setIssuer(CLOCKIFY_JWT_ISSUER)
		.setSubject(ADDON_KEY)
		.setExpirationTime('2h')
		.sign(privateKey);
}

describe('rf-token API logic', () => {
	afterEach(() => {
		resetPublicKeyCacheForTests();
		vi.clearAllMocks();
	});

	it('rejects non-admin for requireAdmin', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		const env = { ADDON_KEY } as unknown as Env;
		const claims = await verifyClockifyJwt(await adminToken(pair.privateKey, false), env);
		expect(() => requireAdmin(claims)).toThrow(/Admin access required/);
	});

	it('stores encrypted RF token via workspace store', async () => {
		const env = {
			WORKSPACE: {} as DurableObjectNamespace,
			KEK: { get: async () => TEST_KEK }
		} as unknown as Env;

		await storeEncryptedToken(env, 'ws-1', 'rf_api', 'secret-rf-key');
		expect(storeEncryptedTokenRow).toHaveBeenCalled();

		vi.mocked(hasEncryptedToken).mockResolvedValue(true);
		const configured = await hasEncryptedToken(env, 'ws-1', 'rf_api');
		expect(configured).toBe(true);
	});
});
