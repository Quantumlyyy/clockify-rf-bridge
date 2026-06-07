export const TABLES = {
	encryptedSecrets: 'encrypted_secrets',
	invoiceMappings: 'invoice_mappings'
} as const;

export type TokenType = 'clockify_install' | 'rf_api';

export interface EncryptedSecretRow {
	workspace_id: string;
	token_type: TokenType;
	iv: ArrayBuffer;
	ciphertext: ArrayBuffer;
	key_version: number;
	updated_at: string;
}

export interface InvoiceMappingRow {
	workspace_id: string;
	clockify_invoice_id: string;
	rf_invoice_id: string;
	rf_request_id: string | null;
	payment_link: string;
	created_at: string;
}

/** Primary keys enforced in migrations/0001_init.sql */
export const PRIMARY_KEYS = {
	encrypted_secrets: ['workspace_id', 'token_type'] as const,
	invoice_mappings: ['workspace_id', 'clockify_invoice_id'] as const
} as const;
