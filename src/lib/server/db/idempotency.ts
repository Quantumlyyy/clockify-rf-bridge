import type { InvoiceMappingRow } from './schema';
import { TABLES } from './schema';

export async function getMapping(
	db: D1Database,
	workspaceId: string,
	clockifyInvoiceId: string
): Promise<InvoiceMappingRow | null> {
	return db
		.prepare(
			`SELECT workspace_id, clockify_invoice_id, rf_invoice_id, rf_request_id, payment_link, created_at
       FROM ${TABLES.invoiceMappings}
       WHERE workspace_id = ? AND clockify_invoice_id = ?`
		)
		.bind(workspaceId, clockifyInvoiceId)
		.first<InvoiceMappingRow>();
}

export async function insertMapping(
	db: D1Database,
	mapping: Omit<InvoiceMappingRow, 'created_at'> & { created_at?: string }
): Promise<InvoiceMappingRow> {
	const existing = await getMapping(db, mapping.workspace_id, mapping.clockify_invoice_id);
	if (existing) return existing;

	const created_at = mapping.created_at ?? new Date().toISOString();
	await db
		.prepare(
			`INSERT INTO ${TABLES.invoiceMappings}
       (workspace_id, clockify_invoice_id, rf_invoice_id, rf_request_id, payment_link, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(
			mapping.workspace_id,
			mapping.clockify_invoice_id,
			mapping.rf_invoice_id,
			mapping.rf_request_id,
			mapping.payment_link,
			created_at
		)
		.run();

	return {
		...mapping,
		created_at
	};
}

export async function deleteWorkspaceMappings(db: D1Database, workspaceId: string): Promise<void> {
	await db
		.prepare(`DELETE FROM ${TABLES.invoiceMappings} WHERE workspace_id = ?`)
		.bind(workspaceId)
		.run();
}
