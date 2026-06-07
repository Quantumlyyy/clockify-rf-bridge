import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRIMARY_KEYS, TABLES } from './schema';

describe('schema', () => {
	const migrationSql = readFileSync(resolve(process.cwd(), 'migrations/0001_init.sql'), 'utf8');

	it('defines both tables in migration SQL', () => {
		expect(migrationSql).toContain(`CREATE TABLE ${TABLES.encryptedSecrets}`);
		expect(migrationSql).toContain(`CREATE TABLE ${TABLES.invoiceMappings}`);
	});

	it('enforces composite primary keys', () => {
		for (const table of Object.keys(PRIMARY_KEYS) as Array<keyof typeof PRIMARY_KEYS>) {
			for (const column of PRIMARY_KEYS[table]) {
				expect(migrationSql).toContain(column);
			}
			expect(migrationSql).toMatch(/PRIMARY KEY\s*\([^)]+\)/);
		}
	});

	it('restricts token_type values', () => {
		expect(migrationSql).toContain("'clockify_install'");
		expect(migrationSql).toContain("'rf_api'");
	});
});
