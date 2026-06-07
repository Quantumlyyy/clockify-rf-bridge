import { decryptSecret, encryptSecret, type EncryptedBlob } from '../crypto';
import { TABLES, type TokenType } from './schema';

function rowToBlob(row: {
	iv: ArrayBuffer | Uint8Array;
	ciphertext: ArrayBuffer | Uint8Array;
	key_version: number;
}): EncryptedBlob {
	return {
		iv: row.iv instanceof Uint8Array ? row.iv : new Uint8Array(row.iv),
		ciphertext:
			row.ciphertext instanceof Uint8Array ? row.ciphertext : new Uint8Array(row.ciphertext),
		keyVersion: row.key_version
	};
}

export async function storeEncryptedToken(
	db: D1Database,
	workspaceId: string,
	tokenType: TokenType,
	plaintext: string,
	env: Env
): Promise<void> {
	const encrypted = await encryptSecret(plaintext, workspaceId, env);
	await db
		.prepare(
			`INSERT INTO ${TABLES.encryptedSecrets}
       (workspace_id, token_type, iv, ciphertext, key_version, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(workspace_id, token_type) DO UPDATE SET
         iv = excluded.iv,
         ciphertext = excluded.ciphertext,
         key_version = excluded.key_version,
         updated_at = excluded.updated_at`
		)
		.bind(
			workspaceId,
			tokenType,
			encrypted.iv,
			encrypted.ciphertext,
			encrypted.keyVersion,
			new Date().toISOString()
		)
		.run();
}

export async function getEncryptedToken(
	db: D1Database,
	workspaceId: string,
	tokenType: TokenType,
	env: Env
): Promise<string | null> {
	const row = await db
		.prepare(
			`SELECT iv, ciphertext, key_version FROM ${TABLES.encryptedSecrets}
       WHERE workspace_id = ? AND token_type = ?`
		)
		.bind(workspaceId, tokenType)
		.first<{
			iv: ArrayBuffer;
			ciphertext: ArrayBuffer;
			key_version: number;
		}>();

	if (!row) return null;
	return decryptSecret(rowToBlob(row), workspaceId, env);
}

export async function deleteWorkspaceSecrets(db: D1Database, workspaceId: string): Promise<void> {
	await db
		.prepare(`DELETE FROM ${TABLES.encryptedSecrets} WHERE workspace_id = ?`)
		.bind(workspaceId)
		.run();
}

export async function hasEncryptedToken(
	db: D1Database,
	workspaceId: string,
	tokenType: TokenType
): Promise<boolean> {
	const row = await db
		.prepare(
			`SELECT 1 as ok FROM ${TABLES.encryptedSecrets} WHERE workspace_id = ? AND token_type = ?`
		)
		.bind(workspaceId, tokenType)
		.first<{ ok: number }>();
	return row?.ok === 1;
}
