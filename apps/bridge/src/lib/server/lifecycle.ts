import { deleteClientMappings } from '@clockify-rf-bridge/workspace-store';
import { verifyClockifyJwt } from './auth';
import { getInstallToken } from './clients/clockify';
import { BadRequestError } from './errors';
import {
	deleteWorkspaceMappingsForWorkspace,
	deleteWorkspaceSecretsForWorkspace,
	storeEncryptedToken
} from './workspace/tokens';
import { loadWorkspaceSettings, syncLegacyClientMapToDo } from './settings';

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
				throw new BadRequestError('INSTALLED lifecycle missing authToken');
			}
			await storeEncryptedToken(env, payload.workspaceId, 'clockify_install', payload.authToken);
			break;
		}
		case 'SETTINGS_UPDATED': {
			await env.cache.delete(`settings:${payload.workspaceId}`);
			const installToken = await getInstallToken(env, payload.workspaceId);
			const claims = await verifyClockifyJwt(lifecycleToken, env);
			const settings = await loadWorkspaceSettings(
				claims.backendUrl,
				payload.workspaceId,
				installToken,
				env
			);
			await syncLegacyClientMapToDo(env, payload.workspaceId, settings);
			break;
		}
		case 'DELETED': {
			await deleteWorkspaceSecretsForWorkspace(env, payload.workspaceId);
			await deleteWorkspaceMappingsForWorkspace(env, payload.workspaceId);
			await deleteClientMappings(env, payload.workspaceId);
			await env.cache.delete(`settings:${payload.workspaceId}`);
			break;
		}
	}
}
