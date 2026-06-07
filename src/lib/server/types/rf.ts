export interface RfTax {
	type: 'percentage' | 'fixed';
	amount: number;
}

export interface RfInvoiceItem {
	currency: string;
	name: string;
	quantity: string;
	unitPrice: string;
	tax?: RfTax;
}

export interface RfAttachment {
	name: string;
	fileName: string;
	hash: string;
}

export interface RfPaymentOption {
	type: 'wallet';
	value: {
		currencies: string[];
		paymentInformation: {
			paymentAddress: string;
			chain: string;
		};
	};
}

export interface RfCreateInvoiceBody {
	meta: { format: 'rnf_invoice'; version: '0.0.3' };
	creationDate: string;
	invoiceItems: RfInvoiceItem[];
	invoiceNumber: string;
	clientId?: string;
	buyerInfo?: { email: string; businessName?: string };
	paymentTerms: { dueDate: string };
	paymentOptions: RfPaymentOption[];
	note?: string;
	tags?: string[];
	categories?: string[];
	miscellaneous?: {
		invoiceTemplateId?: string;
		logoUrl?: string;
	};
	attachments?: RfAttachment[];
	draft?: boolean;
}

export interface RfInvoiceLinks {
	pay?: string;
	view?: string;
	signUpAndPay?: string;
}

export interface RfIssueResponse {
	requestId?: string;
	invoiceLinks?: RfInvoiceLinks;
}

export interface RfInvoiceResponse extends RfIssueResponse {
	id: string;
	status?: string;
}
