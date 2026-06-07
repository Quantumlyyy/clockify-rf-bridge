import { Effect, Layer } from 'effect';
import {
	generateRfInvoice as generateCore,
	ClockifyClientTag,
	ClockifyError,
	InvoiceContextTag,
	ValidationError,
	WorkspaceClientTag,
	WorkspaceError,
	type GenerateOverrides,
	type GenerateResult
} from '@clockify-rf-bridge/invoice-core';
import { RequestFinanceClientLive } from '@clockify-rf-bridge/request-finance';
import { getMapping, getRun, insertMapping, upsertRun } from '@clockify-rf-bridge/workspace-store';
import type { ClockifyClaims } from './auth';
import {
	exportInvoicePdf,
	getInstallToken,
	getInvoice,
	updateInvoiceNote
} from './clients/clockify';
import { NOTE_LINK_PREFIX } from './config';
import { BadRequestError } from './errors';
import { buildRfLineItems } from './money';
import { getRfToken } from './rf-token';
import { loadWorkspaceSettings, resolveRfClientId } from './settings';

export type { GenerateOverrides, GenerateResult };

function toClockifyError(error: unknown): ClockifyError {
	return new ClockifyError({ message: String(error) });
}

function toWorkspaceError(error: unknown): WorkspaceError {
	return new WorkspaceError({ message: String(error) });
}

export async function generateRfInvoice(
	env: Env,
	claims: ClockifyClaims,
	invoiceId: string,
	overrides: GenerateOverrides
): Promise<GenerateResult> {
	const workspaceId = claims.workspaceId;
	const installToken = await getInstallToken(env, workspaceId);
	const clockifyOpts = { backendUrl: claims.backendUrl, installToken };
	const settings = await loadWorkspaceSettings(claims.backendUrl, workspaceId, installToken, env);
	const rfApiKey = await getRfToken(workspaceId, env);

	const workspaceLayer = Layer.succeed(WorkspaceClientTag, {
		getMapping: (clockifyInvoiceId) =>
			Effect.tryPromise({
				try: () => getMapping(env, workspaceId, clockifyInvoiceId),
				catch: toWorkspaceError
			}),
		insertMapping: (mapping) =>
			Effect.tryPromise({
				try: () => insertMapping(env, workspaceId, mapping),
				catch: toWorkspaceError
			}).pipe(Effect.asVoid),
		getRun: (clockifyInvoiceId) =>
			Effect.tryPromise({
				try: () => getRun(env, workspaceId, clockifyInvoiceId),
				catch: toWorkspaceError
			}),
		upsertRun: (run) =>
			Effect.tryPromise({
				try: () => upsertRun(env, workspaceId, run),
				catch: toWorkspaceError
			}).pipe(Effect.asVoid)
	});

	const clockifyLayer = Layer.succeed(ClockifyClientTag, {
		getInstallToken: () => Effect.succeed(installToken),
		getInvoice: (id) =>
			Effect.tryPromise({
				try: () => getInvoice(clockifyOpts, workspaceId, id),
				catch: toClockifyError
			}),
		exportInvoicePdf: (id) =>
			Effect.tryPromise({
				try: () => exportInvoicePdf(clockifyOpts, workspaceId, id),
				catch: toClockifyError
			}),
		updateInvoiceNote: (id, note) =>
			Effect.tryPromise({
				try: () => updateInvoiceNote(clockifyOpts, workspaceId, id, note),
				catch: toClockifyError
			})
	});

	const contextLayer = Layer.succeed(InvoiceContextTag, {
		rfApiKey,
		settings,
		noteLinkPrefix: NOTE_LINK_PREFIX,
		buildLineItems: buildRfLineItems,
		resolveRfClientId: (clockifyClientId) =>
			Effect.tryPromise({
				try: () => resolveRfClientId(env, workspaceId, settings, clockifyClientId),
				catch: (e) =>
					e instanceof BadRequestError
						? new ValidationError({ message: e.message })
						: new ValidationError({ message: String(e) })
			})
	});

	try {
		return await Effect.runPromise(
			generateCore(invoiceId, overrides).pipe(
				Effect.provide(
					Layer.mergeAll(workspaceLayer, clockifyLayer, contextLayer, RequestFinanceClientLive)
				)
			)
		);
	} catch (error) {
		if (error instanceof ValidationError) {
			throw new BadRequestError(error.message);
		}
		throw error;
	}
}
