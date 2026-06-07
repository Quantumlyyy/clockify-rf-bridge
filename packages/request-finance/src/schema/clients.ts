import { Schema } from 'effect';

export const RfClientSummary = Schema.Struct({
	id: Schema.String,
	email: Schema.optional(Schema.String),
	businessName: Schema.optional(Schema.String),
	firstName: Schema.optional(Schema.String),
	lastName: Schema.optional(Schema.String)
});

export type RfClientSummary = typeof RfClientSummary.Type;

export const RfClientListResponse = Schema.Array(RfClientSummary);
