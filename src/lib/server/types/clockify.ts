export interface ClockifyInvoiceItem {
	quantity: number;
	unitPrice: number;
	amount: number;
	description: string;
	itemType?: string;
	timeEntryIds?: string[];
	expenseIds?: string[];
	importType?: string;
}

export interface ClockifyInvoice {
	id: string;
	number: string;
	subject?: string;
	note?: string;
	currency: string;
	issuedDate: string;
	dueDate: string;
	clientId: string;
	clientName?: string;
	clientAddress?: string;
	companyId: string;
	subtotal?: number;
	tax?: number;
	taxPercent: number;
	tax2Percent?: number;
	discountPercent?: number;
	items: ClockifyInvoiceItem[];
}

export interface ClientMapEntry {
	rfClientId: string;
}

export interface WorkspaceSettings {
	clientMap?: Record<string, ClientMapEntry> | string;
	defaultChain?: string;
	defaultSettlementCurrencies?: string[] | string;
	receivingWalletAddress?: string;
	reverseChargeNote?: string;
	rfInvoiceTemplateId?: string;
	sellerLogoUrl?: string;
}
