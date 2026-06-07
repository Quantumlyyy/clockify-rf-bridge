import { verifyClockifyJwt } from './auth';
import { storeEncryptedToken, deleteWorkspaceSecrets } from './db/tokens';
import { deleteWorkspaceMappings } from './db/idempotency';

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

	switch (payload.type) {
		case 'INSTALLED': {
			if (!payload.authToken) {
				throw new Error('INSTALLED lifecycle missing authToken');
			}
			await storeEncryptedToken(
				env.persistence,
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
			await deleteWorkspaceSecrets(env.persistence, payload.workspaceId);
			await deleteWorkspaceMappings(env.persistence, payload.workspaceId);
			await env.cache.delete(`settings:${payload.workspaceId}`);
			break;
		}
	}
}
