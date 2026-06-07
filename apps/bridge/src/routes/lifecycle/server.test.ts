import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetPublicKeyCacheForTests, setVerificationKeyForTests } from '$lib/server/auth';
import { CLOCKIFY_JWT_ISSUER, CLOCKIFY_JWT_TYPE } from '$lib/server/config';

vi.mock('$lib/server/lifecycle', () => ({
	handleLifecycle: vi.fn(async () => undefined)
}));

import { POST } from './+server';
import { handleLifecycle } from '$lib/server/lifecycle';
import { ForbiddenError } from '$lib/server/errors';

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

describe('POST /lifecycle', () => {
	afterEach(() => {
		resetPublicKeyCacheForTests();
		vi.clearAllMocks();
	});

	it('returns 401 when lifecycle token header is missing', async () => {
		const res = await POST({
			request: new Request('https://bridge/lifecycle', {
				method: 'POST',
				body: JSON.stringify({ type: 'INSTALLED', workspaceId: 'ws-1' })
			}),
			platform: { env: { ADDON_KEY } as unknown as Env }
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(401);
	});

	it('returns 204 on successful INSTALLED', async () => {
		const pair = await generateKeyPair('RS256');
		await setVerificationKeyForTests(await exportSPKI(pair.publicKey));

		const res = await POST({
			request: new Request('https://bridge/lifecycle', {
				method: 'POST',
				headers: {
					'X-Addon-Lifecycle-Token': await lifecycleToken(pair.privateKey),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type: 'INSTALLED',
					workspaceId: 'ws-1',
					authToken: 'install-secret'
				})
			}),
			platform: { env: { ADDON_KEY } as unknown as Env }
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(204);
		expect(handleLifecycle).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'INSTALLED', workspaceId: 'ws-1' }),
			expect.any(String),
			expect.objectContaining({ ADDON_KEY })
		);
	});

	it('returns 403 when handleLifecycle rejects with workspace mismatch', async () => {
		vi.mocked(handleLifecycle).mockRejectedValueOnce(new ForbiddenError('Workspace mismatch'));

		const res = await POST({
			request: new Request('https://bridge/lifecycle', {
				method: 'POST',
				headers: {
					'X-Addon-Lifecycle-Token': 'token',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type: 'DELETED',
					workspaceId: 'ws-victim'
				})
			}),
			platform: { env: { ADDON_KEY } as unknown as Env }
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(403);
	});
});
