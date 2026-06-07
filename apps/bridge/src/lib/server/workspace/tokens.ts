import {
	deleteWorkspaceMappings,
	deleteWorkspaceSecrets,
	getEncryptedTokenRow,
	hasEncryptedToken,
	storeEncryptedTokenRow
} from '@clockify-rf-bridge/workspace-store';
import type { TokenType } from '@clockify-rf-bridge/db';
import { decryptSecret, encryptSecret } from '../crypto';

export async function storeEncryptedToken(
	env: Env,
	workspaceId: string,
	tokenType: TokenType,
	plaintext: string
): Promise<void> {
	const encrypted = await encryptSecret(plaintext, workspaceId, env);
	await storeEncryptedTokenRow(env, workspaceId, {
		tokenType,
		iv: encrypted.iv,
		ciphertext: encrypted.ciphertext,
		keyVersion: encrypted.keyVersion
	});
}

export async function getEncryptedToken(
	env: Env,
	workspaceId: string,
	tokenType: TokenType
): Promise<string | null> {
	const row = await getEncryptedTokenRow(env, workspaceId, tokenType);
	if (!row) return null;
	return decryptSecret(
		{
			iv: new Uint8Array(row.iv),
			ciphertext: new Uint8Array(row.ciphertext),
			keyVersion: row.keyVersion
		},
		workspaceId,
		env
	);
}

export async function deleteWorkspaceSecretsForWorkspace(
	env: Env,
	workspaceId: string
): Promise<void> {
	await deleteWorkspaceSecrets(env, workspaceId);
}

export async function deleteWorkspaceMappingsForWorkspace(
	env: Env,
	workspaceId: string
): Promise<void> {
	await deleteWorkspaceMappings(env, workspaceId);
}

export { hasEncryptedToken };
