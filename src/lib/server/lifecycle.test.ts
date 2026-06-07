import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';
import { resetPublicKeyCacheForTests, setVerificationKeyForTests } from './auth';
import { CLOCKIFY_JWT_ISSUER, CLOCKIFY_JWT_TYPE } from './config';
import { handleLifecycle } from './lifecycle';
import { createD1Mock } from './db/d1-mock';
import { getEncryptedToken } from './db/tokens';

const TEST_KEK = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ADDON_KEY = 'clockify-rf-bridge';

async function lifecycleToken(privateKey: CryptoKey): Promise<string> {
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

describe('lifecycle', () => {
	afterEach(() => {
		resetPublicKeyCacheForTests();
	});

	it('INSTALLED stores encrypted install token', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		const db = createD1Mock();
		const env = {
			persistence: db,
			KEK: { get: async () => TEST_KEK },
			cache: { delete: async () => {} },
			ADDON_KEY
		} as unknown as Env;

		await handleLifecycle(
			{ type: 'INSTALLED', workspaceId: 'ws-1', authToken: 'install-secret' },
			await lifecycleToken(pair.privateKey),
			env
		);

		const stored = await getEncryptedToken(db, 'ws-1', 'clockify_install', env);
		expect(stored).toBe('install-secret');
	});
});
