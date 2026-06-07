import { and, eq } from 'drizzle-orm';
import { decryptSecret, encryptSecret, type EncryptedBlob } from '../crypto';
import type { Db } from './index';
import { encryptedSecrets, type TokenType } from './schema';

function rowToBlob(row: {
	iv: Uint8Array;
	ciphertext: Uint8Array;
	keyVersion: number;
}): EncryptedBlob {
	return {
		iv: row.iv,
		ciphertext: row.ciphertext,
		keyVersion: row.keyVersion
	};
}

export async function storeEncryptedToken(
	db: Db,
	workspaceId: string,
	tokenType: TokenType,
	plaintext: string,
	env: Env
): Promise<void> {
	const encrypted = await encryptSecret(plaintext, workspaceId, env);
	const updatedAt = new Date().toISOString();

	await db
		.insert(encryptedSecrets)
		.values({
			workspaceId,
			tokenType,
			iv: encrypted.iv,
			ciphertext: encrypted.ciphertext,
			keyVersion: encrypted.keyVersion,
			updatedAt
		})
		.onConflictDoUpdate({
			target: [encryptedSecrets.workspaceId, encryptedSecrets.tokenType],
			set: {
				iv: encrypted.iv,
				ciphertext: encrypted.ciphertext,
				keyVersion: encrypted.keyVersion,
				updatedAt
			}
		});
}

export async function getEncryptedToken(
	db: Db,
	workspaceId: string,
	tokenType: TokenType,
	env: Env
): Promise<string | null> {
	const row = await db
		.select({
			iv: encryptedSecrets.iv,
			ciphertext: encryptedSecrets.ciphertext,
			keyVersion: encryptedSecrets.keyVersion
		})
		.from(encryptedSecrets)
		.where(
			and(
				eq(encryptedSecrets.workspaceId, workspaceId),
				eq(encryptedSecrets.tokenType, tokenType)
			)
		)
		.get();

	if (!row) return null;
	return decryptSecret(rowToBlob(row), workspaceId, env);
}

export async function deleteWorkspaceSecrets(db: Db, workspaceId: string): Promise<void> {
	await db.delete(encryptedSecrets).where(eq(encryptedSecrets.workspaceId, workspaceId));
}

export async function hasEncryptedToken(
	db: Db,
	workspaceId: string,
	tokenType: TokenType
): Promise<boolean> {
	const row = await db
		.select({ ok: encryptedSecrets.workspaceId })
		.from(encryptedSecrets)
		.where(
			and(
				eq(encryptedSecrets.workspaceId, workspaceId),
				eq(encryptedSecrets.tokenType, tokenType)
			)
		)
		.get();
	return row !== undefined;
}
