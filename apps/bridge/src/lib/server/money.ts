import type { ClockifyInvoice, ClockifyInvoiceItem } from './types/clockify';
import type { RnfInvoiceItem } from '@clockify-rf-bridge/request-finance';

const MINOR_UNIT_SCALE: Record<string, number> = {
	USD: 100,
	EUR: 100,
	GBP: 100
};

export function minorUnitScale(currency: string): number {
	return MINOR_UNIT_SCALE[currency.toUpperCase()] ?? 100;
}

export function toMinorUnits(amount: number, currency: string): string {
	const scale = minorUnitScale(currency);
	return String(Math.round(amount * scale));
}

function isTimeLine(item: ClockifyInvoiceItem): boolean {
	return Array.isArray(item.timeEntryIds) && item.timeEntryIds.length > 0;
}

function isExpenseLine(item: ClockifyInvoiceItem): boolean {
	return Array.isArray(item.expenseIds) && item.expenseIds.length > 0;
}

function taxForLine(
	taxPercent: number
): { type: 'percentage' | 'fixed'; amount: number } | undefined {
	if (!taxPercent || taxPercent <= 0) return undefined;
	return { type: 'percentage', amount: taxPercent };
}

export function buildRfLineItems(invoice: ClockifyInvoice): RnfInvoiceItem[] {
	const currency = invoice.currency;
	const tax = taxForLine(invoice.taxPercent);
	const lines: RnfInvoiceItem[] = [];

	const timeItems = invoice.items.filter(isTimeLine);
	const byRate = new Map<number, { hours: number; description: string }>();

	for (const item of timeItems) {
		const existing = byRate.get(item.unitPrice) ?? {
			hours: 0,
			description: 'Professional services'
		};
		existing.hours += item.quantity;
		if (item.description) existing.description = item.description;
		byRate.set(item.unitPrice, existing);
	}

	for (const [unitPrice, { hours, description }] of byRate) {
		lines.push({
			currency,
			name: description,
			quantity: String(hours),
			unitPrice: toMinorUnits(unitPrice, currency),
			tax
		});
	}

	for (const item of invoice.items.filter(isExpenseLine)) {
		const unitPrice = item.unitPrice ?? item.amount / Math.max(item.quantity, 1);
		lines.push({
			currency,
			name: item.description || 'Expense',
			quantity: String(item.quantity),
			unitPrice: toMinorUnits(unitPrice, currency),
			tax
		});
	}

	return lines;
}
