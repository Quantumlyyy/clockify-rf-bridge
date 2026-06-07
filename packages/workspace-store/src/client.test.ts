import { describe, expect, it } from 'vitest';
import { getMapping } from './client';

describe('workspace-store client', () => {
	it('throws on DO error responses', async () => {
		const env = {
			WORKSPACE: {
				idFromName: () => ({}),
				get: () => ({
					fetch: async () => new Response('fail', { status: 500 })
				})
			}
		} as unknown as import('./client').WorkspaceEnv;

		await expect(getMapping(env, 'ws-1', 'inv-1')).rejects.toThrow(/WorkspaceStore error/);
	});
});
