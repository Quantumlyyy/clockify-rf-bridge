import { customType, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tokenTypes = ['clockify_install', 'rf_api'] as const;
export type TokenType = (typeof tokenTypes)[number];

function blobToUint8Array(value: unknown): Uint8Array {
	if (value instanceof Uint8Array) return value;
	if (value instanceof ArrayBuffer) return new Uint8Array(value);
	if (ArrayBuffer.isView(value)) {
		return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
	}
	throw new Error('Expected blob value');
}

/** Workers-safe blob column — avoids Drizzle's buffer mode, which requires Node's `Buffer`. */
const uint8Blob = customType<{ data: Uint8Array; driverData: Uint8Array }>({
	dataType() {
		return 'blob';
	},
	fromDriver: blobToUint8Array,
	toDriver: (value) => value
});

export const encryptedSecrets = sqliteTable(
	'encrypted_secrets',
	{
		workspaceId: text('workspace_id').notNull(),
		tokenType: text('token_type', { enum: tokenTypes }).notNull(),
		iv: uint8Blob('iv').notNull(),
		ciphertext: uint8Blob('ciphertext').notNull(),
		keyVersion: integer('key_version').notNull().default(1),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [primaryKey({ columns: [table.workspaceId, table.tokenType] })]
);

export const invoiceMappings = sqliteTable(
	'invoice_mappings',
	{
		workspaceId: text('workspace_id').notNull(),
		clockifyInvoiceId: text('clockify_invoice_id').notNull(),
		rfInvoiceId: text('rf_invoice_id').notNull(),
		rfRequestId: text('rf_request_id'),
		paymentLink: text('payment_link').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => [primaryKey({ columns: [table.workspaceId, table.clockifyInvoiceId] })]
);

export type EncryptedSecretRow = typeof encryptedSecrets.$inferSelect;
export type InvoiceMappingRow = typeof invoiceMappings.$inferSelect;

/** Snake_case aliases for call sites that still use raw column names. */
export type InvoiceMapping = {
	workspace_id: string;
	clockify_invoice_id: string;
	rf_invoice_id: string;
	rf_request_id: string | null;
	payment_link: string;
	created_at: string;
};

export function toInvoiceMapping(row: InvoiceMappingRow): InvoiceMapping {
	return {
		workspace_id: row.workspaceId,
		clockify_invoice_id: row.clockifyInvoiceId,
		rf_invoice_id: row.rfInvoiceId,
		rf_request_id: row.rfRequestId,
		payment_link: row.paymentLink,
		created_at: row.createdAt
	};
}
