import { RF_API_BASE } from '../config';
import type {
	RfAttachment,
	RfCreateInvoiceBody,
	RfInvoiceResponse,
	RfIssueResponse
} from '../types/rf';

function rfHeaders(apiKey: string, extra?: HeadersInit): HeadersInit {
	return {
		Authorization: apiKey,
		Accept: 'application/json',
		...extra
	};
}

async function rfFetch<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${RF_API_BASE}${path}`, {
		...init,
		headers: {
			...rfHeaders(apiKey),
			...(init?.headers ?? {})
		}
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Request Finance API error (${res.status}): ${text.slice(0, 300)}`);
	}
	return res.json() as Promise<T>;
}

export async function uploadAttachment(
	apiKey: string,
	pdfBytes: Uint8Array
): Promise<RfAttachment> {
	// Copy into a fresh ArrayBuffer — TS rejects Uint8Array<ArrayBufferLike> as BlobPart.
	const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
	new Uint8Array(pdfBuffer).set(pdfBytes);
	const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
	const form = new FormData();
	form.append('file', blob, 'clockify-invoice.pdf');

	const res = await fetch(`${RF_API_BASE}/invoices/attachments`, {
		method: 'POST',
		headers: rfHeaders(apiKey),
		body: form
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`RF attachment upload failed (${res.status}): ${text.slice(0, 300)}`);
	}

	return res.json() as Promise<RfAttachment>;
}

export async function createInvoice(
	apiKey: string,
	body: RfCreateInvoiceBody
): Promise<RfInvoiceResponse> {
	return rfFetch<RfInvoiceResponse>('/invoices', apiKey, {
		method: 'POST',
		headers: {
			...rfHeaders(apiKey),
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
}

export async function issueInvoice(apiKey: string, invoiceId: string): Promise<RfIssueResponse> {
	return rfFetch<RfIssueResponse>(`/invoices/${invoiceId}`, apiKey, { method: 'POST' });
}

export async function getInvoiceWithLinks(
	apiKey: string,
	invoiceId: string
): Promise<RfInvoiceResponse> {
	return rfFetch<RfInvoiceResponse>(`/invoices/${invoiceId}?withLinks=true`, apiKey);
}
