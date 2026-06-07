import { describe, expect, it } from 'vitest';
import { deleteWorkspaceMappings, getMapping, insertMapping } from './idempotency';
import { createD1Mock } from './d1-mock';

describe('idempotency', () => {
	it('inserts mapping once', async () => {
		const db = createD1Mock();
		const row = await insertMapping(db, {
			workspace_id: 'ws-1',
			clockify_invoice_id: 'inv-1',
			rf_invoice_id: 'rf-1',
			rf_request_id: 'req-1',
			payment_link: 'https://pay.example'
		});
		expect(row.payment_link).toBe('https://pay.example');
	});

	it('returns existing mapping on duplicate insert', async () => {
		const db = createD1Mock();
		await insertMapping(db, {
			workspace_id: 'ws-1',
			clockify_invoice_id: 'inv-1',
			rf_invoice_id: 'rf-1',
			rf_request_id: 'req-1',
			payment_link: 'https://first'
		});
		const second = await insertMapping(db, {
			workspace_id: 'ws-1',
			clockify_invoice_id: 'inv-1',
			rf_invoice_id: 'rf-2',
			rf_request_id: 'req-2',
			payment_link: 'https://second'
		});
		expect(second.payment_link).toBe('https://first');
	});

	it('deletes workspace mappings', async () => {
		const db = createD1Mock();
		await insertMapping(db, {
			workspace_id: 'ws-1',
			clockify_invoice_id: 'inv-1',
			rf_invoice_id: 'rf-1',
			rf_request_id: null,
			payment_link: 'https://pay'
		});
		await deleteWorkspaceMappings(db, 'ws-1');
		const got = await getMapping(db, 'ws-1', 'inv-1');
		expect(got).toBeNull();
	});
});
