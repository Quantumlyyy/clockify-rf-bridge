import { Schema } from 'effect';
import { RnfInvoiceCore, RnfInvoiceItem, RnfPaymentTerms } from './rnf-invoice';

export const RfAttachment = Schema.Struct({
	name: Schema.String,
	fileName: Schema.String,
	hash: Schema.String
});

export type RfAttachment = typeof RfAttachment.Type;

export const RfPaymentOption = Schema.Struct({
	type: Schema.Literal('wallet'),
	value: Schema.Struct({
		currencies: Schema.Array(Schema.String),
		paymentInformation: Schema.Struct({
			paymentAddress: Schema.String,
			chain: Schema.String
		})
	})
});

export type RfPaymentOption = typeof RfPaymentOption.Type;

export const RfInvoiceMiscellaneous = Schema.Struct({
	invoiceTemplateId: Schema.optional(Schema.String),
	logoUrl: Schema.optional(Schema.String)
});

/** Full create-invoice body: rnf core + Request Finance API extensions. */
export const CreateInvoiceRequest = Schema.Struct({
	...RnfInvoiceCore.fields,
	paymentTerms: RnfPaymentTerms,
	paymentOptions: Schema.Array(RfPaymentOption),
	clientId: Schema.optional(Schema.String),
	attachments: Schema.optional(Schema.Array(RfAttachment)),
	draft: Schema.optional(Schema.Boolean),
	tags: Schema.optional(Schema.Array(Schema.String)),
	categories: Schema.optional(Schema.Array(Schema.String)),
	miscellaneous: Schema.optional(RfInvoiceMiscellaneous)
});

export type CreateInvoiceRequest = typeof CreateInvoiceRequest.Type;

export const RfInvoiceLinks = Schema.Struct({
	pay: Schema.optional(Schema.String),
	view: Schema.optional(Schema.String),
	signUpAndPay: Schema.optional(Schema.String)
});

export type RfInvoiceLinks = typeof RfInvoiceLinks.Type;

export const IssueResponse = Schema.Struct({
	requestId: Schema.optional(Schema.String),
	invoiceLinks: Schema.optional(RfInvoiceLinks)
});

export type IssueResponse = typeof IssueResponse.Type;

export const InvoiceResponse = Schema.Struct({
	id: Schema.String,
	status: Schema.optional(Schema.String),
	requestId: Schema.optional(Schema.String),
	invoiceLinks: Schema.optional(RfInvoiceLinks)
});

export type InvoiceResponse = typeof InvoiceResponse.Type;

/** Re-export line item type for consumers building invoice bodies. */
export { RnfInvoiceItem };
