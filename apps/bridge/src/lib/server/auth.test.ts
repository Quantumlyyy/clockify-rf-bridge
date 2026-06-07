import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';
import {
	requireAdmin,
	resetPublicKeyCacheForTests,
	setVerificationKeyForTests,
	verifyClockifyJwt
} from './auth';
import { CLOCKIFY_JWT_ISSUER, CLOCKIFY_JWT_TYPE } from './config';

const ADDON_KEY = 'test-addon-key';

function mockEnv(): Env {
	return { ADDON_KEY } as unknown as Env;
}

async function signTestJwt(
	privateKey: CryptoKey,
	claims: Record<string, unknown>,
	exp?: string
): Promise<string> {
	const builder = new SignJWT({ type: CLOCKIFY_JWT_TYPE, ...claims })
		.setProtectedHeader({ alg: 'RS256' })
		.setIssuer(CLOCKIFY_JWT_ISSUER)
		.setSubject(ADDON_KEY);

	if (exp === 'expired') {
		builder.setExpirationTime(Math.floor(Date.now() / 1000) - 60);
	} else {
		builder.setExpirationTime('2h');
	}

	return builder.sign(privateKey);
}

describe('auth', () => {
	let privateKey: CryptoKey;
	let publicPem: string;

	afterEach(() => {
		resetPublicKeyCacheForTests();
	});

	it('verifies valid RS256 token and parses claims', async () => {
		const pair = await generateKeyPair('RS256');
		privateKey = pair.privateKey;
		publicPem = await exportSPKI(pair.publicKey);
		await setVerificationKeyForTests(publicPem);

		const token = await signTestJwt(privateKey, {
			backendUrl: 'https://api.clockify.me/api',
			workspaceId: 'ws-abc',
			user: { admin: true, email: 'a@b.c' }
		});

		const claims = await verifyClockifyJwt(token, mockEnv());
		expect(claims.workspaceId).toBe('ws-abc');
		expect(claims.backendUrl).toBe('https://api.clockify.me/api');
	});

	it('rejects expired token', async () => {
		const pair = await generateKeyPair('RS256');
		privateKey = pair.privateKey;
		publicPem = await exportSPKI(pair.publicKey);
		await setVerificationKeyForTests(publicPem);

		const token = await signTestJwt(
			privateKey,
			{ backendUrl: 'https://api.clockify.me/api', workspaceId: 'ws-abc' },
			'expired'
		);

		await expect(verifyClockifyJwt(token, mockEnv())).rejects.toThrow(/Invalid or expired/);
	});

	it('rejects wrong issuer', async () => {
		const pair = await generateKeyPair('RS256');
		privateKey = pair.privateKey;
		publicPem = await exportSPKI(pair.publicKey);
		await setVerificationKeyForTests(publicPem);

		const token = await new SignJWT({ type: CLOCKIFY_JWT_TYPE, backendUrl: 'x', workspaceId: 'w' })
			.setProtectedHeader({ alg: 'RS256' })
			.setIssuer('wrong')
			.setSubject(ADDON_KEY)
			.setExpirationTime('2h')
			.sign(privateKey);

		await expect(verifyClockifyJwt(token, mockEnv())).rejects.toThrow();
	});

	it('rejects wrong sub', async () => {
		const pair = await generateKeyPair('RS256');
		privateKey = pair.privateKey;
		publicPem = await exportSPKI(pair.publicKey);
		await setVerificationKeyForTests(publicPem);

		const token = await new SignJWT({ type: CLOCKIFY_JWT_TYPE, backendUrl: 'x', workspaceId: 'w' })
			.setProtectedHeader({ alg: 'RS256' })
			.setIssuer(CLOCKIFY_JWT_ISSUER)
			.setSubject('wrong-key')
			.setExpirationTime('2h')
			.sign(privateKey);

		await expect(verifyClockifyJwt(token, mockEnv())).rejects.toThrow();
	});

	it('requireAdmin allows admin user', () => {
		expect(() =>
			requireAdmin({
				backendUrl: 'x',
				workspaceId: 'w',
				user: { admin: true }
			})
		).not.toThrow();
	});

	it('requireAdmin rejects non-admin', () => {
		expect(() =>
			requireAdmin({
				backendUrl: 'x',
				workspaceId: 'w',
				user: { admin: false }
			})
		).toThrow(/Admin access required/);
	});
});
