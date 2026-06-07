import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetPublicKeyCacheForTests, setVerificationKeyForTests } from './auth';
import { CLOCKIFY_JWT_ISSUER, CLOCKIFY_JWT_TYPE } from './config';
import { handleLifecycle } from './lifecycle';
import { BadRequestError } from './errors';

vi.mock('@clockify-rf-bridge/workspace-store', () => ({
	storeEncryptedTokenRow: vi.fn(async () => undefined),
	deleteWorkspaceSecrets: vi.fn(async () => undefined),
	deleteWorkspaceMappings: vi.fn(async () => undefined),
	deleteClientMappings: vi.fn(async () => undefined),
	getClientMapping: vi.fn(async () => null),
	upsertClientMappings: vi.fn(async () => [])
}));

vi.mock('./workspace/tokens', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./workspace/tokens')>();
	return {
		...actual,
		getEncryptedToken: vi.fn()
	};
});

import {
	deleteClientMappings,
	storeEncryptedTokenRow,
	upsertClientMappings
} from '@clockify-rf-bridge/workspace-store';
import { getEncryptedToken } from './workspace/tokens';

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
		vi.mocked(storeEncryptedTokenRow).mockClear();
		vi.mocked(getEncryptedToken).mockReset();
		vi.unstubAllGlobals();
	});

	it('INSTALLED without authToken throws BadRequestError', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		const env = { ADDON_KEY } as unknown as Env;

		await expect(
			handleLifecycle(
				{ type: 'INSTALLED', workspaceId: 'ws-1' },
				await lifecycleToken(pair.privateKey),
				env
			)
		).rejects.toBeInstanceOf(BadRequestError);
	});

	it('INSTALLED stores encrypted install token via workspace store', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		const env = {
			WORKSPACE: {} as DurableObjectNamespace,
			KEK: { get: async () => TEST_KEK },
			cache: { delete: async () => {} },
			ADDON_KEY
		} as unknown as Env;

		vi.mocked(getEncryptedToken).mockResolvedValue('install-secret');

		await handleLifecycle(
			{ type: 'INSTALLED', workspaceId: 'ws-1', authToken: 'install-secret' },
			await lifecycleToken(pair.privateKey),
			env
		);

		expect(storeEncryptedTokenRow).toHaveBeenCalled();
	});

	it('SETTINGS_UPDATED syncs legacy clientMap into DO', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		const env = {
			WORKSPACE: {} as DurableObjectNamespace,
			KEK: { get: async () => TEST_KEK },
			cache: {
				delete: async () => {},
				get: async () => null,
				put: async () => {}
			},
			ADDON_KEY
		} as unknown as Env;
		vi.mocked(getEncryptedToken).mockResolvedValue('install-secret');

		const fetchMock = vi.fn(async () =>
			Response.json({
				clientMap: { 'clk-1': { rfClientId: 'rf-1' } }
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		await handleLifecycle(
			{ type: 'SETTINGS_UPDATED', workspaceId: 'ws-1' },
			await lifecycleToken(pair.privateKey),
			env
		);

		expect(upsertClientMappings).toHaveBeenCalledWith(
			env,
			'ws-1',
			expect.arrayContaining([
				expect.objectContaining({
					clockify_client_id: 'clk-1',
					rf_client_id: 'rf-1'
				})
			])
		);

		vi.unstubAllGlobals();
	});

	it('DELETED clears client mappings', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));
		const env = {
			WORKSPACE: {} as DurableObjectNamespace,
			KEK: { get: async () => TEST_KEK },
			cache: { delete: async () => {} },
			ADDON_KEY
		} as unknown as Env;

		await handleLifecycle(
			{ type: 'DELETED', workspaceId: 'ws-1' },
			await lifecycleToken(pair.privateKey),
			env
		);

		expect(deleteClientMappings).toHaveBeenCalledWith(env, 'ws-1');
	});
});
