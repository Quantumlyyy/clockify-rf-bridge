import { deleteClientMappings } from '@clockify-rf-bridge/workspace-store';
import { requireMatchingWorkspace, verifyClockifyJwt } from './auth';
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
	const claims = await verifyClockifyJwt(lifecycleToken, env);
	requireMatchingWorkspace(claims, payload, env);
	const workspaceId = claims.workspaceId;

	switch (payload.type) {
		case 'INSTALLED': {
			if (!payload.authToken) {
				throw new BadRequestError('INSTALLED lifecycle missing authToken');
			}
			await storeEncryptedToken(env, workspaceId, 'clockify_install', payload.authToken);
			break;
		}
		case 'SETTINGS_UPDATED': {
			await env.cache.delete(`settings:${workspaceId}`);
			const installToken = await getInstallToken(env, workspaceId);
			const settings = await loadWorkspaceSettings(
				claims.backendUrl,
				workspaceId,
				installToken,
				env
			);
			await syncLegacyClientMapToDo(env, workspaceId, settings);
			break;
		}
		case 'DELETED': {
			await deleteWorkspaceSecretsForWorkspace(env, workspaceId);
			await deleteWorkspaceMappingsForWorkspace(env, workspaceId);
			await deleteClientMappings(env, workspaceId);
			await env.cache.delete(`settings:${workspaceId}`);
			break;
		}
	}
}
