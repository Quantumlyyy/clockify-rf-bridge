import { Context, Effect, Layer, Schema } from 'effect';
import { RF_API_BASE } from './config';
import { RfHttpError, RfParseError, type RfApiError } from './errors';
import {
	CreateInvoiceRequest,
	InvoiceResponse,
	IssueResponse,
	RfAttachment,
	type CreateInvoiceRequest as CreateInvoiceRequestType
} from './schema/api';
import { RfClientListResponse, type RfClientSummary } from './schema/clients';

function rfHeaders(apiKey: string, extra?: HeadersInit): HeadersInit {
	return {
		Authorization: apiKey,
		Accept: 'application/json',
		...extra
	};
}

function decodeResponse<A, I>(
	schema: Schema.Schema<A, I>,
	json: unknown
): Effect.Effect<A, RfParseError> {
	return Schema.decodeUnknown(schema)(json).pipe(
		Effect.mapError((e) => new RfParseError({ message: String(e) }))
	);
}

function rfFetch<T>(
	path: string,
	apiKey: string,
	schema: Schema.Schema<T>,
	init?: RequestInit
): Effect.Effect<T, RfApiError> {
	return Effect.tryPromise({
		try: () =>
			fetch(`${RF_API_BASE}${path}`, {
				...init,
				headers: {
					...rfHeaders(apiKey),
					...(init?.headers ?? {})
				}
			}),
		catch: (e) => new RfHttpError({ status: 0, body: String(e) })
	}).pipe(
		Effect.flatMap((res) =>
			Effect.gen(function* () {
				if (!res.ok) {
					const text = yield* Effect.tryPromise({
						try: () => res.text(),
						catch: (e) => new RfHttpError({ status: res.status, body: String(e) })
					});
					return yield* Effect.fail(
						new RfHttpError({ status: res.status, body: text.slice(0, 300) })
					);
				}
				const json: unknown = yield* Effect.tryPromise({
					try: () => res.json(),
					catch: (e) => new RfHttpError({ status: res.status, body: String(e) })
				});
				return yield* decodeResponse(schema, json);
			})
		)
	);
}

export interface RequestFinanceClientService {
	readonly uploadAttachment: (
		apiKey: string,
		pdfBytes: Uint8Array
	) => Effect.Effect<RfAttachment, RfApiError>;
	readonly createInvoice: (
		apiKey: string,
		body: CreateInvoiceRequestType
	) => Effect.Effect<InvoiceResponse, RfApiError>;
	readonly issueInvoice: (
		apiKey: string,
		invoiceId: string
	) => Effect.Effect<IssueResponse, RfApiError>;
	readonly getInvoiceWithLinks: (
		apiKey: string,
		invoiceId: string
	) => Effect.Effect<InvoiceResponse, RfApiError>;
	readonly listClients: (
		apiKey: string,
		params?: { take?: number; skip?: number; search?: string }
	) => Effect.Effect<readonly RfClientSummary[], RfApiError>;
}

export class RequestFinanceClient extends Context.Tag('RequestFinanceClient')<
	RequestFinanceClient,
	RequestFinanceClientService
>() {}

const liveClient: RequestFinanceClientService = {
	uploadAttachment: (apiKey, pdfBytes) =>
		Effect.gen(function* () {
			const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
			new Uint8Array(pdfBuffer).set(pdfBytes);
			const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
			const form = new FormData();
			form.append('file', blob, 'clockify-invoice.pdf');

			const res = yield* Effect.tryPromise({
				try: () =>
					fetch(`${RF_API_BASE}/invoices/attachments`, {
						method: 'POST',
						headers: rfHeaders(apiKey),
						body: form
					}),
				catch: (e) => new RfHttpError({ status: 0, body: String(e) })
			});

			if (!res.ok) {
				const text = yield* Effect.tryPromise({
					try: () => res.text(),
					catch: (e) => new RfHttpError({ status: res.status, body: String(e) })
				});
				return yield* Effect.fail(
					new RfHttpError({ status: res.status, body: text.slice(0, 300) })
				);
			}

			const json: unknown = yield* Effect.tryPromise({
				try: () => res.json(),
				catch: (e) => new RfHttpError({ status: res.status, body: String(e) })
			});
			return yield* decodeResponse(RfAttachment, json);
		}),

	createInvoice: (apiKey, body) =>
		Effect.gen(function* () {
			const encoded = yield* Schema.encode(CreateInvoiceRequest)(body).pipe(
				Effect.mapError((e) => new RfParseError({ message: String(e) }))
			);
			return yield* rfFetch('/invoices', apiKey, InvoiceResponse, {
				method: 'POST',
				headers: {
					...rfHeaders(apiKey),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(encoded)
			});
		}),

	issueInvoice: (apiKey, invoiceId) =>
		rfFetch(`/invoices/${invoiceId}`, apiKey, IssueResponse, { method: 'POST' }),

	getInvoiceWithLinks: (apiKey, invoiceId) =>
		rfFetch(`/invoices/${invoiceId}?withLinks=true`, apiKey, InvoiceResponse),

	listClients: (apiKey, params = {}) => {
		const query = new URLSearchParams({ type: 'customer', format: 'paginated' });
		if (params.take != null) query.set('take', String(params.take));
		if (params.skip != null) query.set('skip', String(params.skip));
		if (params.search) query.set('search', params.search);
		return rfFetch(`/clients?${query}`, apiKey, RfClientListResponse);
	}
};

export const RequestFinanceClientLive = Layer.succeed(RequestFinanceClient, liveClient);

/** Convenience helpers for non-Effect call sites during migration. */
export const uploadAttachment = (apiKey: string, pdfBytes: Uint8Array) =>
	Effect.runPromise(liveClient.uploadAttachment(apiKey, pdfBytes));

export const createInvoice = (apiKey: string, body: CreateInvoiceRequestType) =>
	Effect.runPromise(liveClient.createInvoice(apiKey, body));

export const issueInvoice = (apiKey: string, invoiceId: string) =>
	Effect.runPromise(liveClient.issueInvoice(apiKey, invoiceId));

export const getInvoiceWithLinks = (apiKey: string, invoiceId: string) =>
	Effect.runPromise(liveClient.getInvoiceWithLinks(apiKey, invoiceId));
