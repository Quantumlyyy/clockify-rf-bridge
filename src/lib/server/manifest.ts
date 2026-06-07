type SettingType = 'TXT';

interface ManifestSetting {
	id: string;
	name: string;
	description?: string;
	type: SettingType;
	accessLevel: 'ADMINS' | 'EVERYONE';
	value: string | string[];
	placeholder?: string;
}

function txt(
	id: string,
	name: string,
	opts?: { description?: string; placeholder?: string }
): ManifestSetting {
	return {
		id,
		name,
		type: 'TXT',
		accessLevel: 'ADMINS',
		value: '',
		...opts
	};
}

export function buildManifest(baseUrl: string, addonKey: string) {
	const origin = baseUrl.replace(/\/$/, '');
	return {
		schemaVersion: '1.4',
		key: addonKey,
		name: 'Request Finance Bridge',
		description: 'Create Request Finance crypto invoices from Clockify invoices',
		baseUrl: origin,
		minimalSubscriptionPlan: 'STANDARD',
		scopes: ['INVOICE_READ', 'INVOICE_WRITE'],
		components: [
			{
				type: 'invoices.action',
				path: '/invoices/action',
				label: 'Create RF crypto invoice',
				accessLevel: 'EVERYONE'
			},
			{
				type: 'sidebar',
				path: '/self-hosted-settings',
				label: 'Request Finance API token',
				accessLevel: 'ADMINS'
			}
		],
		lifecycle: [
			{ type: 'INSTALLED', path: '/lifecycle' },
			{ type: 'SETTINGS_UPDATED', path: '/lifecycle' },
			{ type: 'DELETED', path: '/lifecycle' }
		],
		settings: {
			tabs: [
				{
					id: 'integration',
					name: 'Request Finance',
					settings: [
						txt('clientMap', 'Client to RF client mapping', {
							description:
								'JSON object: Clockify client ID → { "rfClientId": "..." }. Example: {"clk-id":{"rfClientId":"rf-id"}}',
							placeholder: '{}'
						}),
						txt('defaultChain', 'Default chain (optional UI prefill)', {
							placeholder: 'mainnet'
						}),
						{
							id: 'defaultSettlementCurrencies',
							name: 'Settlement currencies (optional UI prefill)',
							description: 'Comma-separated RF currency IDs, e.g. USDC-mainnet, USDT-mainnet',
							type: 'TXT',
							accessLevel: 'ADMINS',
							value: '',
							placeholder: 'USDC-mainnet'
						},
						txt('receivingWalletAddress', 'Default receiving wallet (optional UI prefill)', {
							placeholder: '0x…'
						}),
						txt('reverseChargeNote', 'RF invoice note'),
						txt('rfInvoiceTemplateId', 'RF invoice template ID'),
						txt('sellerLogoUrl', 'Seller logo URL')
					]
				}
			]
		}
	};
}
