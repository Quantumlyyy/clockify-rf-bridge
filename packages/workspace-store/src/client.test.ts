import { describe, expect, it, vi } from 'vitest';
import { getMapping, hasEncryptedToken, storeEncryptedTokenRow } from './client';

describe('workspace-store client', () => {
	it('throws when DO returns 500', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('fail', { status: 500 }));
		const env = {
			WORKSPACE: {
				idFromName: () => 'id',
				get: () => ({ fetch: fetchMock })
			}
		} as unknown as import('./client').WorkspaceEnv;

		await expect(getMapping(env, 'ws-1', 'inv-1')).rejects.toThrow(/WorkspaceStore error \(500\)/);
	});

	it('returns exists flag from token-exists route', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ exists: true }), { status: 200 }));
		const env = {
			WORKSPACE: {
				idFromName: () => 'id',
				get: () => ({ fetch: fetchMock })
			}
		} as unknown as import('./client').WorkspaceEnv;

		const exists = await hasEncryptedToken(env, 'ws-1', 'rf_api');
		expect(exists).toBe(true);
		expect(String(fetchMock.mock.calls[0][0])).toContain('/token-exists/rf_api');
	});

	it('posts encrypted token payload to /token', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('null', { status: 200 }));
		const env = {
			WORKSPACE: {
				idFromName: () => 'id',
				get: () => ({ fetch: fetchMock })
			}
		} as unknown as import('./client').WorkspaceEnv;

		await storeEncryptedTokenRow(env, 'ws-1', {
			tokenType: 'rf_api',
			iv: new Uint8Array([1, 2]),
			ciphertext: new Uint8Array([3, 4]),
			keyVersion: 1
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'https://do/token',
			expect.objectContaining({ method: 'POST' })
		);
		const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
		expect(body.tokenType).toBe('rf_api');
		expect(body.iv).toEqual([1, 2]);
	});
});
