import { describe, expect, it } from 'vitest';
import { buildManifest } from './manifest';

describe('manifest', () => {
	it('builds schema 1.4 manifest with structured settings and token sidebar', () => {
		const m = buildManifest('https://example.com', 'my-dev-addon-key');
		expect(m.key).toBe('my-dev-addon-key');
		expect(m.schemaVersion).toBe('1.4');
		expect(m.baseUrl).toBe('https://example.com');
		expect(m.minimalSubscriptionPlan).toBe('STANDARD');
		expect(m.scopes).toEqual(['INVOICE_READ', 'INVOICE_WRITE']);
		expect(m.components.map((c) => c.type)).toEqual(['invoices.action', 'sidebar', 'sidebar']);
		expect(m.components[1].path).toBe('/self-hosted-settings');
		expect(m.components[2].path).toBe('/settings/client-mapping');
		expect(m.settings.tabs[0].settings.map((s) => s.id)).not.toContain('invoiceNumberPrefix');
		expect(m.lifecycle.map((l) => l.type)).toEqual(['INSTALLED', 'SETTINGS_UPDATED', 'DELETED']);
	});
});
