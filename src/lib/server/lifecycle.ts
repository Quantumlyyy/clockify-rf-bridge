import { verifyClockifyJwt } from './auth';
import { deleteWorkspaceMappings } from './db/idempotency';
import { getDb } from './db/index';
import { storeEncryptedToken, deleteWorkspaceSecrets } from './db/tokens';

export interface LifecyclePayload {
	type: 'INSTALLED' | 'SETTINGS_UPDATED' | 'DELETED';
	workspaceId: string;
	addonId?: string;
	authToken?: string;
}

export async function handleLifecycle(
	payload: LifecyclePayload,
	lifecycleToken: string,
	env: Env
): Promise<void> {
	await verifyClockifyJwt(lifecycleToken, env);
	const db = getDb(env);

	switch (payload.type) {
		case 'INSTALLED': {
			if (!payload.authToken) {
				throw new Error('INSTALLED lifecycle missing authToken');
			}
			await storeEncryptedToken(
				db,
				payload.workspaceId,
				'clockify_install',
				payload.authToken,
				env
			);
			break;
		}
		case 'SETTINGS_UPDATED': {
			await env.cache.delete(`settings:${payload.workspaceId}`);
			break;
		}
		case 'DELETED': {
			await deleteWorkspaceSecrets(db, payload.workspaceId);
			await deleteWorkspaceMappings(db, payload.workspaceId);
			await env.cache.delete(`settings:${payload.workspaceId}`);
			break;
		}
	}
}
