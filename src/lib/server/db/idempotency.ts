import { and, eq } from 'drizzle-orm';
import type { Db } from './index';
import {
	invoiceMappings,
	toInvoiceMapping,
	type InvoiceMapping,
	type InvoiceMappingRow
} from './schema';

export async function getMapping(
	db: Db,
	workspaceId: string,
	clockifyInvoiceId: string
): Promise<InvoiceMapping | null> {
	const row = await db
		.select()
		.from(invoiceMappings)
		.where(
			and(
				eq(invoiceMappings.workspaceId, workspaceId),
				eq(invoiceMappings.clockifyInvoiceId, clockifyInvoiceId)
			)
		)
		.get();

	return row ? toInvoiceMapping(row) : null;
}

export async function insertMapping(
	db: Db,
	mapping: Omit<InvoiceMapping, 'created_at'> & { created_at?: string }
): Promise<InvoiceMapping> {
	const existing = await getMapping(db, mapping.workspace_id, mapping.clockify_invoice_id);
	if (existing) return existing;

	const createdAt = mapping.created_at ?? new Date().toISOString();
	await db.insert(invoiceMappings).values({
		workspaceId: mapping.workspace_id,
		clockifyInvoiceId: mapping.clockify_invoice_id,
		rfInvoiceId: mapping.rf_invoice_id,
		rfRequestId: mapping.rf_request_id,
		paymentLink: mapping.payment_link,
		createdAt
	});

	return {
		...mapping,
		created_at: createdAt
	};
}

export async function deleteWorkspaceMappings(db: Db, workspaceId: string): Promise<void> {
	await db.delete(invoiceMappings).where(eq(invoiceMappings.workspaceId, workspaceId));
}

export type { InvoiceMappingRow };
