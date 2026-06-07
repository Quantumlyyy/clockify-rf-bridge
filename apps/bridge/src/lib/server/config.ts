import CLOCKIFY_JWT_PUBLIC_KEY_PEM from '../../../clockify-jwt-public-key.pem?raw';

export { CLOCKIFY_JWT_PUBLIC_KEY_PEM };

export const CLOCKIFY_JWT_ISSUER = 'clockify';
export const CLOCKIFY_JWT_TYPE = 'addon';

export const RF_CURRENCIES_CACHE_KEY = 'rf:invoicing-currencies';
export const RF_CURRENCIES_CACHE_TTL_SECONDS = 86400;

export const NOTE_LINK_PREFIX = 'Pay via Request Finance: ';

export function getAddonKey(env: Env): string {
	if (!env.ADDON_KEY) {
		throw new Error('ADDON_KEY is not configured');
	}
	return env.ADDON_KEY;
}
