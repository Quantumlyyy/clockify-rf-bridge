import { getEncryptedToken } from '../db/tokens';
import type { Db } from '../db/index';
import type { ClockifyInvoice, WorkspaceSettings } from '../types/clockify';
import { BadRequestError } from '../errors';

export interface ClockifyClientOptions {
	backendUrl: string;
	installToken: string;
}

function apiBase(backendUrl: string): string {
	return backendUrl.replace(/\/$/, '');
}

function headers(installToken: string): HeadersInit {
	return {
		'X-Addon-Token': installToken,
		Accept: 'application/json',
		'Content-Type': 'application/json'
	};
}

async function clockifyFetch<T>(url: string, installToken: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		...init,
		headers: {
			...headers(installToken),
			...(init?.headers ?? {})
		}
	});
	if (!res.ok) {
		const text = await res.text();
		throw new BadRequestError(`Clockify API error (${res.status}): ${text.slice(0, 200)}`);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

export async function getInstallToken(
	db: Db,
	workspaceId: string,
	env: Env
): Promise<string> {
	const token = await getEncryptedToken(db, workspaceId, 'clockify_install', env);
	if (!token) {
		throw new BadRequestError('Add-on is not installed for this workspace');
	}
	return token;
}

export async function getInvoice(
	opts: ClockifyClientOptions,
	workspaceId: string,
	invoiceId: string
): Promise<ClockifyInvoice> {
	const url = `${apiBase(opts.backendUrl)}/v1/workspaces/${workspaceId}/invoices/${invoiceId}`;
	return clockifyFetch<ClockifyInvoice>(url, opts.installToken);
}

export async function exportInvoicePdf(
	opts: ClockifyClientOptions,
	workspaceId: string,
	invoiceId: string,
	userLocale = 'en'
): Promise<Uint8Array> {
	const url = `${apiBase(opts.backendUrl)}/v1/workspaces/${workspaceId}/invoices/${invoiceId}/export?userLocale=${userLocale}`;
	const res = await fetch(url, { headers: headers(opts.installToken) });
	if (!res.ok) {
		throw new BadRequestError(`Clockify PDF export failed (${res.status})`);
	}
	const base64 = await res.json();
	if (typeof base64 !== 'string') {
		throw new BadRequestError('Unexpected PDF export format');
	}
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

export async function updateInvoiceNote(
	opts: ClockifyClientOptions,
	workspaceId: string,
	invoiceId: string,
	noteAppend: string
): Promise<ClockifyInvoice> {
	const invoice = await getInvoice(opts, workspaceId, invoiceId);
	const existingNote = invoice.note?.trim() ?? '';
	const note = existingNote ? `${existingNote}\n\n${noteAppend}` : noteAppend;

	const body = {
		currency: invoice.currency,
		discountPercent: invoice.discountPercent ?? 0,
		dueDate: invoice.dueDate,
		issuedDate: invoice.issuedDate,
		number: invoice.number,
		taxPercent: invoice.taxPercent,
		tax2Percent: invoice.tax2Percent ?? 0,
		clientId: invoice.clientId,
		companyId: invoice.companyId,
		subject: invoice.subject,
		note
	};

	const url = `${apiBase(opts.backendUrl)}/v1/workspaces/${workspaceId}/invoices/${invoiceId}`;
	return clockifyFetch<ClockifyInvoice>(url, opts.installToken, {
		method: 'PUT',
		body: JSON.stringify(body)
	});
}

export async function getSettings(
	opts: ClockifyClientOptions,
	workspaceId: string
): Promise<WorkspaceSettings> {
	const url = `${apiBase(opts.backendUrl)}/addon/workspaces/${workspaceId}/settings`;
	return clockifyFetch<WorkspaceSettings>(url, opts.installToken);
}

export async function patchSettings(
	opts: ClockifyClientOptions,
	workspaceId: string,
	settings: Partial<WorkspaceSettings>
): Promise<WorkspaceSettings> {
	const url = `${apiBase(opts.backendUrl)}/addon/workspaces/${workspaceId}/settings`;
	return clockifyFetch<WorkspaceSettings>(url, opts.installToken, {
		method: 'PATCH',
		body: JSON.stringify(settings)
	});
}
