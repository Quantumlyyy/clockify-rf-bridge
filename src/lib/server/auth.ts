import { importSPKI, jwtVerify, type JWTPayload } from 'jose';
import {
	CLOCKIFY_JWT_ISSUER,
	CLOCKIFY_JWT_PUBLIC_KEY_PEM,
	CLOCKIFY_JWT_TYPE,
	getAddonKey
} from './config';
import { ForbiddenError, UnauthorizedError } from './errors';

export interface ClockifyUser {
	id?: string;
	email?: string;
	name?: string;
	admin?: boolean;
}

export interface ClockifyClaims extends JWTPayload {
	backendUrl: string;
	reportsUrl?: string;
	workspaceId: string;
	user?: ClockifyUser;
	addonId?: string;
	type?: string;
}

let cachedPublicKey: CryptoKey | null = null;

async function getVerificationKey(): Promise<CryptoKey> {
	if (!cachedPublicKey) {
		cachedPublicKey = await importSPKI(CLOCKIFY_JWT_PUBLIC_KEY_PEM, 'RS256');
	}
	return cachedPublicKey;
}

export function extractBearerOrRawToken(request: Request): string | null {
	const header = request.headers.get('Authorization');
	if (header?.startsWith('Bearer ')) {
		return header.slice(7);
	}
	const query = new URL(request.url).searchParams.get('auth_token');
	if (query) return query;
	return request.headers.get('X-Addon-Token');
}

export async function verifyClockifyJwt(
	token: string,
	env: Env,
	options?: { allowExpired?: boolean }
): Promise<ClockifyClaims> {
	try {
		const key = await getVerificationKey();
		const addonKey = getAddonKey(env);
		const { payload } = await jwtVerify(token, key, {
			issuer: CLOCKIFY_JWT_ISSUER,
			subject: addonKey,
			...(options?.allowExpired ? { clockTolerance: '1 day' } : {})
		});

		if (payload.type !== CLOCKIFY_JWT_TYPE) {
			throw new UnauthorizedError('Invalid token type');
		}

		const claims = payload as ClockifyClaims;
		if (!claims.backendUrl || !claims.workspaceId) {
			throw new UnauthorizedError('Missing required claims');
		}

		return claims;
	} catch (error) {
		if (error instanceof UnauthorizedError) throw error;
		throw new UnauthorizedError('Invalid or expired token');
	}
}

export async function verifyClockifyJwtFromRequest(
	request: Request,
	env: Env
): Promise<ClockifyClaims> {
	const token = extractBearerOrRawToken(request);
	if (!token) {
		throw new UnauthorizedError('Missing auth token');
	}
	return verifyClockifyJwt(token, env);
}

/** Settings / RF-token endpoints are admin-only in Clockify. */
export function requireAdmin(claims: ClockifyClaims): void {
	const admin = claims.user?.admin === true;
	if (!admin) {
		throw new ForbiddenError('Admin access required');
	}
}

export function resetPublicKeyCacheForTests(): void {
	cachedPublicKey = null;
}

export async function setVerificationKeyForTests(pem: string): Promise<void> {
	cachedPublicKey = await importSPKI(pem, 'RS256');
}
