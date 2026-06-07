import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { invoiceRunStatuses, type InvoiceRunStatus } from '../common/enums';

export const invoiceRuns = sqliteTable('invoice_runs', {
	clockifyInvoiceId: text('clockify_invoice_id').primaryKey(),
	status: text('status', { enum: invoiceRunStatuses }).notNull(),
	rfAttachmentHash: text('rf_attachment_hash'),
	rfInvoiceId: text('rf_invoice_id'),
	rfRequestId: text('rf_request_id'),
	paymentLink: text('payment_link'),
	errorMessage: text('error_message'),
	updatedAt: text('updated_at').notNull()
});

export type InvoiceRunRow = typeof invoiceRuns.$inferSelect;

export type InvoiceRun = {
	clockify_invoice_id: string;
	status: InvoiceRunStatus;
	rf_attachment_hash: string | null;
	rf_invoice_id: string | null;
	rf_request_id: string | null;
	payment_link: string | null;
	error_message: string | null;
	updated_at: string;
};

export function toInvoiceRun(row: InvoiceRunRow): InvoiceRun {
	return {
		clockify_invoice_id: row.clockifyInvoiceId,
		status: row.status,
		rf_attachment_hash: row.rfAttachmentHash,
		rf_invoice_id: row.rfInvoiceId,
		rf_request_id: row.rfRequestId,
		payment_link: row.paymentLink,
		error_message: row.errorMessage,
		updated_at: row.updatedAt
	};
}
