import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const invoiceMappings = sqliteTable('invoice_mappings', {
	clockifyInvoiceId: text('clockify_invoice_id').primaryKey(),
	rfInvoiceId: text('rf_invoice_id').notNull(),
	rfRequestId: text('rf_request_id'),
	paymentLink: text('payment_link').notNull(),
	createdAt: text('created_at').notNull()
});

export type InvoiceMappingRow = typeof invoiceMappings.$inferSelect;

export type InvoiceMapping = {
	clockify_invoice_id: string;
	rf_invoice_id: string;
	rf_request_id: string | null;
	payment_link: string;
	created_at: string;
};

export function toInvoiceMapping(row: InvoiceMappingRow): InvoiceMapping {
	return {
		clockify_invoice_id: row.clockifyInvoiceId,
		rf_invoice_id: row.rfInvoiceId,
		rf_request_id: row.rfRequestId,
		payment_link: row.paymentLink,
		created_at: row.createdAt
	};
}
