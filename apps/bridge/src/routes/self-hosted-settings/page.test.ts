import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), '+page.svelte'),
	'utf8'
);

describe('self-hosted-settings security', () => {
	it('uses password input type for API token field', () => {
		expect(pageSource).toContain('type="password"');
		expect(pageSource).not.toContain('secret-rf-key');
	});
});
