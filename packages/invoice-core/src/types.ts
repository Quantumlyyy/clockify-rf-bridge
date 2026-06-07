import { Context, Data, Effect } from 'effect';
import type {
	CreateInvoiceRequest,
	RfApiError,
	RfAttachment
} from '@clockify-rf-bridge/request-finance';
import type { InvoiceRunStatus } from '@clockify-rf-bridge/db';

export class ValidationError extends Data.TaggedError('ValidationError')<{
	readonly message: string;
}> {}

export class ClockifyError extends Data.TaggedError('ClockifyError')<{
	readonly message: string;
}> {}

export class WorkspaceError extends Data.TaggedError('WorkspaceError')<{
	readonly message: string;
}> {}

export type GenerateError = ValidationError | ClockifyError | WorkspaceError | RfApiError;

export interface GenerateOverrides {
	chain: string;
	settlementCurrencies: string[];
	receivingWalletAddress: string;
}

export interface GenerateResult {
	paymentLink: string;
	rfInvoiceId: string;
	rfRequestId?: string;
	reused: boolean;
}

export interface ClockifyInvoice {
	id: string;
	number?: string;
	issuedDate: string;
	dueDate: string;
	clientId?: string;
	currency: string;
	taxPercent: number;
	items: ClockifyInvoiceItem[];
}

export interface ClockifyInvoiceItem {
	description?: string;
	quantity: number;
	unitPrice: number;
	amount: number;
	timeEntryIds?: string[];
	expenseIds?: string[];
}

export interface WorkspaceSettings {
	rfClientId?: string;
	rfClientIdByClockifyClient?: Record<string, string>;
	reverseChargeNote?: string;
	rfInvoiceTemplateId?: string;
	sellerLogoUrl?: string;
}

export interface ClockifyClient {
	readonly getInstallToken: () => Effect.Effect<string, ClockifyError>;
	readonly getInvoice: (invoiceId: string) => Effect.Effect<ClockifyInvoice, ClockifyError>;
	readonly exportInvoicePdf: (invoiceId: string) => Effect.Effect<Uint8Array, ClockifyError>;
	readonly updateInvoiceNote: (
		invoiceId: string,
		note: string
	) => Effect.Effect<void, ClockifyError>;
}

export interface WorkspaceClient {
	readonly getMapping: (clockifyInvoiceId: string) => Effect.Effect<
		{
			clockify_invoice_id: string;
			rf_invoice_id: string;
			rf_request_id: string | null;
			payment_link: string;
		} | null,
		WorkspaceError
	>;
	readonly insertMapping: (mapping: {
		clockify_invoice_id: string;
		rf_invoice_id: string;
		rf_request_id: string | null;
		payment_link: string;
	}) => Effect.Effect<void, WorkspaceError>;
	readonly getRun: (clockifyInvoiceId: string) => Effect.Effect<
		{
			status: InvoiceRunStatus;
			rf_attachment_hash: string | null;
			rf_invoice_id: string | null;
			rf_request_id: string | null;
			payment_link: string | null;
		} | null,
		WorkspaceError
	>;
	readonly upsertRun: (run: {
		clockify_invoice_id: string;
		status: InvoiceRunStatus;
		rf_attachment_hash?: string | null;
		rf_invoice_id?: string | null;
		rf_request_id?: string | null;
		payment_link?: string | null;
		error_message?: string | null;
	}) => Effect.Effect<void, WorkspaceError>;
}

export interface InvoiceContext {
	readonly rfApiKey: string;
	readonly settings: WorkspaceSettings;
	readonly noteLinkPrefix: string;
	readonly buildLineItems: (invoice: ClockifyInvoice) => CreateInvoiceRequest['invoiceItems'];
	readonly resolveRfClientId: (clockifyClientId: string) => Effect.Effect<string, ValidationError>;
}

export class ClockifyClientTag extends Context.Tag('ClockifyClient')<
	ClockifyClientTag,
	ClockifyClient
>() {}

export class WorkspaceClientTag extends Context.Tag('WorkspaceClient')<
	WorkspaceClientTag,
	WorkspaceClient
>() {}

export class InvoiceContextTag extends Context.Tag('InvoiceContext')<
	InvoiceContextTag,
	InvoiceContext
>() {}

export type { RfAttachment };
