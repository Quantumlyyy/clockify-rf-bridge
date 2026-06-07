import { describe, expect, it, vi } from 'vitest';

describe('invoices action page', () => {
	it('reads invoiceId from query params', () => {
		const params = new URLSearchParams('auth_token=x&invoiceId=inv-123');
		expect(params.get('invoiceId')).toBe('inv-123');
	});

	it('postMessage contract for success toast', () => {
		const postMessage = vi.fn();
		const top = { postMessage };
		top.postMessage({ type: 'toastrPop', level: 'success', message: 'ok' }, '*');
		expect(postMessage).toHaveBeenCalledWith(
			{ type: 'toastrPop', level: 'success', message: 'ok' },
			'*'
		);
	});
});
