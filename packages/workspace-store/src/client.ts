import type {
	ClientMapping,
	InvoiceMapping,
	InvoiceRun,
	InvoiceRunStatus,
	TokenType
} from '@clockify-rf-bridge/db';
import type {
	EncryptedBlobPayload,
	InsertMappingPayload,
	UpsertClientMappingPayload,
	UpsertRunPayload
} from './workspace-store';

export interface WorkspaceEnv {
	WORKSPACE: DurableObjectNamespace;
}

function stub(env: WorkspaceEnv, workspaceId: string): DurableObjectStub {
	return env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
}

async function doJson<T>(request: Promise<Response>): Promise<T> {
	const res = await request;
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`WorkspaceStore error (${res.status}): ${text}`);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

export async function getMapping(
	env: WorkspaceEnv,
	workspaceId: string,
	clockifyInvoiceId: string
): Promise<InvoiceMapping | null> {
	return doJson(
		stub(env, workspaceId).fetch(`https://do/mapping/${encodeURIComponent(clockifyInvoiceId)}`)
	);
}

export async function insertMapping(
	env: WorkspaceEnv,
	workspaceId: string,
	mapping: InsertMappingPayload
): Promise<InvoiceMapping> {
	return doJson(
		stub(env, workspaceId).fetch('https://do/mapping', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(mapping)
		})
	);
}

export async function getRun(
	env: WorkspaceEnv,
	workspaceId: string,
	clockifyInvoiceId: string
): Promise<InvoiceRun | null> {
	return doJson(
		stub(env, workspaceId).fetch(`https://do/run/${encodeURIComponent(clockifyInvoiceId)}`)
	);
}

export async function upsertRun(
	env: WorkspaceEnv,
	workspaceId: string,
	run: UpsertRunPayload
): Promise<InvoiceRun> {
	return doJson(
		stub(env, workspaceId).fetch('https://do/run', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(run)
		})
	);
}

export async function getEncryptedTokenRow(
	env: WorkspaceEnv,
	workspaceId: string,
	tokenType: TokenType
): Promise<EncryptedBlobPayload | null> {
	return doJson(stub(env, workspaceId).fetch(`https://do/token/${encodeURIComponent(tokenType)}`));
}

export async function storeEncryptedTokenRow(
	env: WorkspaceEnv,
	workspaceId: string,
	payload: {
		tokenType: TokenType;
		iv: Uint8Array;
		ciphertext: Uint8Array;
		keyVersion: number;
	}
): Promise<void> {
	await doJson(
		stub(env, workspaceId).fetch('https://do/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				tokenType: payload.tokenType,
				iv: Array.from(payload.iv),
				ciphertext: Array.from(payload.ciphertext),
				keyVersion: payload.keyVersion,
				updatedAt: new Date().toISOString()
			})
		})
	);
}

export async function hasEncryptedToken(
	env: WorkspaceEnv,
	workspaceId: string,
	tokenType: TokenType
): Promise<boolean> {
	const result = await doJson<{ exists: boolean }>(
		stub(env, workspaceId).fetch(`https://do/token-exists/${encodeURIComponent(tokenType)}`)
	);
	return result.exists;
}

export async function deleteWorkspaceSecrets(
	env: WorkspaceEnv,
	workspaceId: string
): Promise<void> {
	await doJson(stub(env, workspaceId).fetch('https://do/secrets', { method: 'DELETE' }));
}

export async function deleteWorkspaceMappings(
	env: WorkspaceEnv,
	workspaceId: string
): Promise<void> {
	await doJson(stub(env, workspaceId).fetch('https://do/mappings', { method: 'DELETE' }));
}

export async function listClientMappings(
	env: WorkspaceEnv,
	workspaceId: string
): Promise<ClientMapping[]> {
	return doJson(stub(env, workspaceId).fetch('https://do/client-mappings'));
}

export async function getClientMapping(
	env: WorkspaceEnv,
	workspaceId: string,
	clockifyClientId: string
): Promise<ClientMapping | null> {
	return doJson(
		stub(env, workspaceId).fetch(
			`https://do/client-mapping/${encodeURIComponent(clockifyClientId)}`
		)
	);
}

export async function upsertClientMappings(
	env: WorkspaceEnv,
	workspaceId: string,
	mappings: UpsertClientMappingPayload[]
): Promise<ClientMapping[]> {
	return doJson(
		stub(env, workspaceId).fetch('https://do/client-mappings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(mappings)
		})
	);
}

export async function deleteClientMappings(env: WorkspaceEnv, workspaceId: string): Promise<void> {
	await doJson(stub(env, workspaceId).fetch('https://do/client-mappings', { method: 'DELETE' }));
}

export type { InvoiceRunStatus, UpsertClientMappingPayload };
