export const tokenTypes = ['clockify_install', 'rf_api'] as const;
export type TokenType = (typeof tokenTypes)[number];

export const invoiceRunStatuses = [
	'pending',
	'pdf_uploaded',
	'created',
	'issued',
	'note_updated',
	'completed',
	'failed'
] as const;
export type InvoiceRunStatus = (typeof invoiceRunStatuses)[number];
