import { describe, expect, it } from 'vitest';
import { buildRfLineItems, toMinorUnits } from './money';
import type { ClockifyInvoice } from './types/clockify';

function baseInvoice(overrides: Partial<ClockifyInvoice> = {}): ClockifyInvoice {
	return {
		id: 'inv-1',
		number: '2024-001',
		currency: 'USD',
		issuedDate: '2024-01-01',
		dueDate: '2024-01-31',
		clientId: 'c-1',
		companyId: 'co-1',
		taxPercent: 0,
		items: [],
		...overrides
	};
}

describe('money', () => {
	it('converts float amounts to minor units', () => {
		expect(toMinorUnits(73.2, 'USD')).toBe('7320');
		expect(toMinorUnits(10, 'EUR')).toBe('1000');
	});

	it('groups time lines by hourly rate', () => {
		const lines = buildRfLineItems(
			baseInvoice({
				items: [
					{
						quantity: 5,
						unitPrice: 100,
						amount: 500,
						description: 'Dev work',
						timeEntryIds: ['t1', 't2']
					},
					{
						quantity: 3,
						unitPrice: 100,
						amount: 300,
						description: 'Dev work',
						timeEntryIds: ['t3']
					},
					{
						quantity: 2,
						unitPrice: 150,
						amount: 300,
						description: 'Senior dev',
						timeEntryIds: ['t4']
					}
				]
			})
		);

		expect(lines).toHaveLength(2);
		expect(lines[0]).toMatchObject({ quantity: '8', unitPrice: '10000', currency: 'USD' });
		expect(lines[1]).toMatchObject({ quantity: '2', unitPrice: '15000', currency: 'USD' });
	});

	it('maps expense lines one-to-one', () => {
		const lines = buildRfLineItems(
			baseInvoice({
				currency: 'EUR',
				items: [
					{
						quantity: 1,
						unitPrice: 45.5,
						amount: 45.5,
						description: 'Travel',
						expenseIds: ['e1']
					}
				]
			})
		);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({
			name: 'Travel',
			quantity: '1',
			unitPrice: '4550',
			currency: 'EUR'
		});
	});

});
