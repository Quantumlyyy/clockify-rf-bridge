import { Schema } from 'effect';

/** rnf_invoice 0.0.3 meta block. */
export const RnfMeta = Schema.Struct({
	format: Schema.Literal('rnf_invoice'),
	version: Schema.Literal('0.0.3')
});

export type RnfMeta = typeof RnfMeta.Type;

/** Tax on a line item — rnf uses string amounts; bridge may send numeric percentages. */
export const RnfTax = Schema.Struct({
	type: Schema.Literal('percentage', 'fixed'),
	amount: Schema.Union(Schema.Number, Schema.String)
});

export type RnfTax = typeof RnfTax.Type;

/**
 * Quantity: rnf spec is number; RF API accepts string quantities in practice.
 * Encode as string to match existing bridge behaviour.
 */
const Quantity = Schema.Union(Schema.Number, Schema.NumberFromString).pipe(
	Schema.transform(Schema.String, {
		decode: (n) => String(n),
		encode: (s) => Number(s)
	})
);

/** Line item for create-invoice API — tax optional when zero/not applicable. */
export const RnfInvoiceItem = Schema.Struct({
	name: Schema.String,
	currency: Schema.String.pipe(Schema.minLength(2)),
	quantity: Quantity,
	unitPrice: Schema.String.pipe(Schema.pattern(/^-?\d+$/)),
	reference: Schema.optional(Schema.String),
	discount: Schema.optional(Schema.String.pipe(Schema.pattern(/^\d+$/))),
	tax: Schema.optional(RnfTax),
	deliveryDate: Schema.optional(Schema.String),
	deliveryPeriod: Schema.optional(Schema.String)
});

export type RnfInvoiceItem = typeof RnfInvoiceItem.Type;

export const RnfPaymentTerms = Schema.Struct({
	dueDate: Schema.optional(Schema.String),
	lateFeesPercent: Schema.optional(Schema.Number),
	lateFeesFix: Schema.optional(Schema.String.pipe(Schema.pattern(/^\d+$/))),
	miscellaneous: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
});

export type RnfPaymentTerms = typeof RnfPaymentTerms.Type;

export const RnfPartyInfo = Schema.Struct({
	email: Schema.optional(Schema.String),
	firstName: Schema.optional(Schema.String),
	lastName: Schema.optional(Schema.String),
	businessName: Schema.optional(Schema.String),
	phone: Schema.optional(Schema.String),
	taxRegistration: Schema.optional(Schema.String),
	companyRegistration: Schema.optional(Schema.String),
	miscellaneous: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
});

export type RnfPartyInfo = typeof RnfPartyInfo.Type;

/** Core rnf_invoice 0.0.3 fields required by the format. */
export const RnfInvoiceCore = Schema.Struct({
	meta: RnfMeta,
	creationDate: Schema.String,
	invoiceNumber: Schema.String,
	invoiceItems: Schema.Array(RnfInvoiceItem),
	purchaseOrderId: Schema.optional(Schema.String),
	note: Schema.optional(Schema.String),
	terms: Schema.optional(Schema.String),
	sellerInfo: Schema.optional(RnfPartyInfo),
	buyerInfo: Schema.optional(RnfPartyInfo),
	paymentTerms: Schema.optional(RnfPaymentTerms),
	miscellaneous: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
});

export type RnfInvoiceCore = typeof RnfInvoiceCore.Type;
