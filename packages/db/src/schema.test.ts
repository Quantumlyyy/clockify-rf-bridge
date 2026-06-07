import { describe, expect, it } from 'vitest';
import {
	clientMappings,
	encryptedSecrets,
	invoiceMappings,
	invoiceRuns,
	tokenTypes
} from '../src/schema';

describe('db schema', () => {
	it('defines expected tables', () => {
		expect(encryptedSecrets).toBeDefined();
		expect(invoiceMappings).toBeDefined();
		expect(invoiceRuns).toBeDefined();
		expect(clientMappings).toBeDefined();
		expect(tokenTypes).toContain('clockify_install');
	});
});
