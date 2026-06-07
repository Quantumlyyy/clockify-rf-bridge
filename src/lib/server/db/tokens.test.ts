import { describe, expect, it } from 'vitest';
import { deleteWorkspaceSecrets, getEncryptedToken, storeEncryptedToken } from './tokens';
import { createD1Mock } from './d1-mock';

const TEST_KEK = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function mockEnv(db: D1Database): Env {
	return {
		persistence: db,
		KEK: { get: async () => TEST_KEK }
	} as unknown as Env;
}

describe('tokens', () => {
	it('stores and fetches encrypted token', async () => {
		const db = createD1Mock();
		const env = mockEnv(db);
		await storeEncryptedToken(db, 'ws-1', 'rf_api', 'rf-secret-key', env);
		const got = await getEncryptedToken(db, 'ws-1', 'rf_api', env);
		expect(got).toBe('rf-secret-key');
	});

	it('deletes workspace secrets', async () => {
		const db = createD1Mock();
		const env = mockEnv(db);
		await storeEncryptedToken(db, 'ws-1', 'clockify_install', 'clk', env);
		await deleteWorkspaceSecrets(db, 'ws-1');
		const got = await getEncryptedToken(db, 'ws-1', 'clockify_install', env);
		expect(got).toBeNull();
	});
});
