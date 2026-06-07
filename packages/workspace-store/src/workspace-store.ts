import { DurableObject } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { drizzle, type DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import migrations from '@clockify-rf-bridge/db/migrations';
import {
	clientMappings,
	encryptedSecrets,
	invoiceMappings,
	invoiceRuns,
	toClientMapping,
	toInvoiceMapping,
	toInvoiceRun,
	type ClientMapping,
	type InvoiceMapping,
	type InvoiceRun,
	type InvoiceRunStatus,
	type TokenType
} from '@clockify-rf-bridge/db';
import * as schema from '@clockify-rf-bridge/db';

export interface EncryptedBlobPayload {
	iv: number[];
	ciphertext: number[];
	keyVersion: number;
}

export interface StoreTokenPayload {
	tokenType: TokenType;
	iv: number[];
	ciphertext: number[];
	keyVersion: number;
	updatedAt: string;
}

export interface InsertMappingPayload {
	clockify_invoice_id: string;
	rf_invoice_id: string;
	rf_request_id: string | null;
	payment_link: string;
	created_at?: string;
}

export interface UpsertRunPayload {
	clockify_invoice_id: string;
	status: InvoiceRunStatus;
	rf_attachment_hash?: string | null;
	rf_invoice_id?: string | null;
	rf_request_id?: string | null;
	payment_link?: string | null;
	error_message?: string | null;
}

export interface UpsertClientMappingPayload {
	clockify_client_id: string;
	rf_client_id: string;
	rf_client_label?: string | null;
	clockify_client_name?: string | null;
}

function pathParam(path: string, prefix: string): string {
	return decodeURIComponent(path.slice(prefix.length));
}

export class WorkspaceStore extends DurableObject {
	storage: DurableObjectStorage;
	db: DrizzleSqliteDODatabase<typeof schema>;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.storage = ctx.storage;
		this.db = drizzle(this.storage, { schema, logger: false });
		ctx.blockConcurrencyWhile(async () => {
			await migrate(this.db, migrations);
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		try {
			if (request.method === 'GET' && path.startsWith('/mapping/')) {
				const id = pathParam(path, '/mapping/');
				const mapping = await this.getMapping(id);
				return Response.json(mapping);
			}

			if (request.method === 'POST' && path === '/mapping') {
				const body = (await request.json()) as InsertMappingPayload;
				const mapping = await this.insertMapping(body);
				return Response.json(mapping);
			}

			if (request.method === 'DELETE' && path === '/mappings') {
				// eslint-disable-next-line drizzle/enforce-delete-with-where -- workspace-wide clear
				await this.db.delete(invoiceMappings);
				return new Response(null, { status: 204 });
			}

			if (request.method === 'GET' && path.startsWith('/run/')) {
				const id = pathParam(path, '/run/');
				const run = await this.getRun(id);
				return Response.json(run);
			}

			if (request.method === 'POST' && path === '/run') {
				const body = (await request.json()) as UpsertRunPayload;
				const run = await this.upsertRun(body);
				return Response.json(run);
			}

			if (request.method === 'GET' && path.startsWith('/token/')) {
				const tokenType = pathParam(path, '/token/') as TokenType;
				const row = await this.getEncryptedTokenRow(tokenType);
				return Response.json(row);
			}

			if (request.method === 'POST' && path === '/token') {
				const body = (await request.json()) as StoreTokenPayload;
				await this.storeEncryptedToken(body);
				return new Response(null, { status: 204 });
			}

			if (request.method === 'GET' && path.startsWith('/token-exists/')) {
				const tokenType = pathParam(path, '/token-exists/') as TokenType;
				const exists = await this.hasEncryptedToken(tokenType);
				return Response.json({ exists });
			}

			if (request.method === 'DELETE' && path === '/secrets') {
				// eslint-disable-next-line drizzle/enforce-delete-with-where -- workspace-wide clear
				await this.db.delete(encryptedSecrets);
				return new Response(null, { status: 204 });
			}

			if (request.method === 'GET' && path === '/client-mappings') {
				return Response.json(await this.listClientMappings());
			}

			if (request.method === 'GET' && path.startsWith('/client-mapping/')) {
				const id = pathParam(path, '/client-mapping/');
				const mapping = await this.getClientMapping(id);
				return Response.json(mapping);
			}

			if (request.method === 'PUT' && path === '/client-mappings') {
				const body = (await request.json()) as UpsertClientMappingPayload[];
				const mappings = await this.upsertClientMappings(body);
				return Response.json(mappings);
			}

			if (request.method === 'DELETE' && path === '/client-mappings') {
				// eslint-disable-next-line drizzle/enforce-delete-with-where -- workspace-wide clear
				await this.db.delete(clientMappings);
				return new Response(null, { status: 204 });
			}

			return new Response('Not found', { status: 404 });
		} catch (error) {
			return Response.json({ error: String(error) }, { status: 500 });
		}
	}

	async getMapping(clockifyInvoiceId: string): Promise<InvoiceMapping | null> {
		const row = await this.db
			.select()
			.from(invoiceMappings)
			.where(eq(invoiceMappings.clockifyInvoiceId, clockifyInvoiceId))
			.get();
		return row ? toInvoiceMapping(row) : null;
	}

	async insertMapping(payload: InsertMappingPayload): Promise<InvoiceMapping> {
		const existing = await this.getMapping(payload.clockify_invoice_id);
		if (existing) return existing;

		const createdAt = payload.created_at ?? new Date().toISOString();
		await this.db.insert(invoiceMappings).values({
			clockifyInvoiceId: payload.clockify_invoice_id,
			rfInvoiceId: payload.rf_invoice_id,
			rfRequestId: payload.rf_request_id,
			paymentLink: payload.payment_link,
			createdAt
		});

		return {
			clockify_invoice_id: payload.clockify_invoice_id,
			rf_invoice_id: payload.rf_invoice_id,
			rf_request_id: payload.rf_request_id,
			payment_link: payload.payment_link,
			created_at: createdAt
		};
	}

	async getRun(clockifyInvoiceId: string): Promise<InvoiceRun | null> {
		const row = await this.db
			.select()
			.from(invoiceRuns)
			.where(eq(invoiceRuns.clockifyInvoiceId, clockifyInvoiceId))
			.get();
		return row ? toInvoiceRun(row) : null;
	}

	async upsertRun(payload: UpsertRunPayload): Promise<InvoiceRun> {
		const updatedAt = new Date().toISOString();
		const existing = await this.getRun(payload.clockify_invoice_id);

		if (existing) {
			await this.db
				.update(invoiceRuns)
				.set({
					status: payload.status,
					rfAttachmentHash: payload.rf_attachment_hash ?? existing.rf_attachment_hash,
					rfInvoiceId: payload.rf_invoice_id ?? existing.rf_invoice_id,
					rfRequestId: payload.rf_request_id ?? existing.rf_request_id,
					paymentLink: payload.payment_link ?? existing.payment_link,
					errorMessage: payload.error_message ?? null,
					updatedAt
				})
				.where(eq(invoiceRuns.clockifyInvoiceId, payload.clockify_invoice_id));
		} else {
			await this.db.insert(invoiceRuns).values({
				clockifyInvoiceId: payload.clockify_invoice_id,
				status: payload.status,
				rfAttachmentHash: payload.rf_attachment_hash ?? null,
				rfInvoiceId: payload.rf_invoice_id ?? null,
				rfRequestId: payload.rf_request_id ?? null,
				paymentLink: payload.payment_link ?? null,
				errorMessage: payload.error_message ?? null,
				updatedAt
			});
		}

		return (await this.getRun(payload.clockify_invoice_id))!;
	}

	async getEncryptedTokenRow(tokenType: TokenType): Promise<EncryptedBlobPayload | null> {
		const row = await this.db
			.select({
				iv: encryptedSecrets.iv,
				ciphertext: encryptedSecrets.ciphertext,
				keyVersion: encryptedSecrets.keyVersion
			})
			.from(encryptedSecrets)
			.where(eq(encryptedSecrets.tokenType, tokenType))
			.get();

		if (!row) return null;
		return {
			iv: Array.from(row.iv),
			ciphertext: Array.from(row.ciphertext),
			keyVersion: row.keyVersion
		};
	}

	async storeEncryptedToken(payload: StoreTokenPayload): Promise<void> {
		await this.db
			.insert(encryptedSecrets)
			.values({
				tokenType: payload.tokenType,
				iv: new Uint8Array(payload.iv),
				ciphertext: new Uint8Array(payload.ciphertext),
				keyVersion: payload.keyVersion,
				updatedAt: payload.updatedAt
			})
			.onConflictDoUpdate({
				target: encryptedSecrets.tokenType,
				set: {
					iv: new Uint8Array(payload.iv),
					ciphertext: new Uint8Array(payload.ciphertext),
					keyVersion: payload.keyVersion,
					updatedAt: payload.updatedAt
				}
			});
	}

	async hasEncryptedToken(tokenType: TokenType): Promise<boolean> {
		const row = await this.db
			.select({ ok: encryptedSecrets.tokenType })
			.from(encryptedSecrets)
			.where(eq(encryptedSecrets.tokenType, tokenType))
			.get();
		return row !== undefined;
	}

	async listClientMappings(): Promise<ClientMapping[]> {
		const rows = await this.db.select().from(clientMappings);
		return rows.map(toClientMapping);
	}

	async getClientMapping(clockifyClientId: string): Promise<ClientMapping | null> {
		const row = await this.db
			.select()
			.from(clientMappings)
			.where(eq(clientMappings.clockifyClientId, clockifyClientId))
			.get();
		return row ? toClientMapping(row) : null;
	}

	async upsertClientMappings(payloads: UpsertClientMappingPayload[]): Promise<ClientMapping[]> {
		const updatedAt = new Date().toISOString();
		for (const payload of payloads) {
			await this.db
				.insert(clientMappings)
				.values({
					clockifyClientId: payload.clockify_client_id,
					rfClientId: payload.rf_client_id,
					rfClientLabel: payload.rf_client_label ?? null,
					clockifyClientName: payload.clockify_client_name ?? null,
					updatedAt
				})
				.onConflictDoUpdate({
					target: clientMappings.clockifyClientId,
					set: {
						rfClientId: payload.rf_client_id,
						rfClientLabel: payload.rf_client_label ?? null,
						clockifyClientName: payload.clockify_client_name ?? null,
						updatedAt
					}
				});
		}
		return this.listClientMappings();
	}
}
