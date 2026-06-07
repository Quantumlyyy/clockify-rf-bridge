import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';
import {
	requireAdmin,
	resetPublicKeyCacheForTests,
	setVerificationKeyForTests,
	verifyClockifyJwt
} from '$lib/server/auth';
import { CLOCKIFY_JWT_ISSUER, CLOCKIFY_JWT_TYPE } from '$lib/server/config';
import { storeEncryptedToken, hasEncryptedToken } from '$lib/server/db/tokens';
import { createTestDb } from '$lib/server/db/test-db';

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
	});

	it('rejects non-admin for requireAdmin', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		const env = { ADDON_KEY } as unknown as Env;
		const claims = await verifyClockifyJwt(await adminToken(pair.privateKey, false), env);
		expect(() => requireAdmin(claims)).toThrow(/Admin access required/);
	});

	it('stores encrypted RF token without echoing', async () => {
		const db = createTestDb();
		const env = {
			KEK: { get: async () => TEST_KEK }
		} as unknown as Env;

		await storeEncryptedToken(db, 'ws-1', 'rf_api', 'secret-rf-key', env);
		const configured = await hasEncryptedToken(db, 'ws-1', 'rf_api');
		expect(configured).toBe(true);

		const { getEncryptedToken } = await import('$lib/server/db/tokens');
		const decrypted = await getEncryptedToken(db, 'ws-1', 'rf_api', env);
		expect(decrypted).toBe('secret-rf-key');
	});
});
