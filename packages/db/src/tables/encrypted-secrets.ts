import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { uint8Blob } from '../common/blob';
import { tokenTypes } from '../common/enums';

/** Tenant is implicit via Durable Object id — no workspace_id column. */
export const encryptedSecrets = sqliteTable('encrypted_secrets', {
	tokenType: text('token_type', { enum: tokenTypes }).primaryKey(),
	iv: uint8Blob('iv').notNull(),
	ciphertext: uint8Blob('ciphertext').notNull(),
	keyVersion: integer('key_version').notNull().default(1),
	updatedAt: text('updated_at').notNull()
});

export type EncryptedSecretRow = typeof encryptedSecrets.$inferSelect;
