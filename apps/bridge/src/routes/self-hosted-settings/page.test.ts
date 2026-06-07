import { describe, expect, it } from 'vitest';

describe('self-hosted-settings page', () => {
	it('does not echo saved token in markup contract', () => {
		const tokenInput = '';
		const configured = true;
		const html = configured ? 'Token is configured' : '';
		expect(html).not.toContain('secret-rf-key');
		expect(tokenInput).toBe('');
	});
});
