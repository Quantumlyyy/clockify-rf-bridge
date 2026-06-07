import { getTableColumns, getTableName } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { encryptedSecrets, invoiceMappings, tokenTypes } from './schema';

describe('schema', () => {
	const migrationSql = readFileSync(resolve(process.cwd(), 'migrations/0001_init.sql'), 'utf8');

	it('defines both tables in migration SQL', () => {
		expect(migrationSql).toContain(`CREATE TABLE ${getTableName(encryptedSecrets)}`);
		expect(migrationSql).toContain(`CREATE TABLE ${getTableName(invoiceMappings)}`);
	});

	it('maps Drizzle tables to migration column names', () => {
		const secretColumns = getTableColumns(encryptedSecrets);
		expect(secretColumns.workspaceId.name).toBe('workspace_id');
		expect(secretColumns.tokenType.name).toBe('token_type');
		expect(secretColumns.iv.name).toBe('iv');
		expect(secretColumns.ciphertext.name).toBe('ciphertext');
		expect(secretColumns.keyVersion.name).toBe('key_version');
		expect(secretColumns.updatedAt.name).toBe('updated_at');

		const mappingColumns = getTableColumns(invoiceMappings);
		expect(mappingColumns.workspaceId.name).toBe('workspace_id');
		expect(mappingColumns.clockifyInvoiceId.name).toBe('clockify_invoice_id');
		expect(mappingColumns.rfInvoiceId.name).toBe('rf_invoice_id');
		expect(mappingColumns.rfRequestId.name).toBe('rf_request_id');
		expect(mappingColumns.paymentLink.name).toBe('payment_link');
		expect(mappingColumns.createdAt.name).toBe('created_at');
	});

	it('restricts token_type values', () => {
		expect(tokenTypes).toContain('clockify_install');
		expect(tokenTypes).toContain('rf_api');
		expect(migrationSql).toContain("'clockify_install'");
		expect(migrationSql).toContain("'rf_api'");
	});
});
