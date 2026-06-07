const CURRENT_KEY_VERSION = 1;
const IV_LENGTH = 12;

export interface EncryptedBlob {
	iv: Uint8Array;
	ciphertext: Uint8Array;
	keyVersion: number;
}

function hexToBytes(hex: string): Uint8Array {
	const normalized = hex.trim();
	if (normalized.length % 2 !== 0) {
		throw new Error('Invalid hex KEK length');
	}
	const bytes = new Uint8Array(normalized.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

async function resolveKekBytes(env: Env): Promise<Uint8Array> {
	const fromStore = await env.KEK.get();
	if (fromStore) {
		return hexToBytes(fromStore);
	}
	const local = (env as Env & { RF_KEK?: string }).RF_KEK;
	if (local) {
		return hexToBytes(local);
	}
	throw new Error('KEK is not configured');
}

async function importAesKey(env: Env): Promise<CryptoKey> {
	const raw = await resolveKekBytes(env);
	if (raw.length !== 32) {
		throw new Error('KEK must be 32 bytes');
	}
	return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function workspaceAad(workspaceId: string): Uint8Array {
	return new TextEncoder().encode(workspaceId);
}

export async function encryptSecret(
	plaintext: string,
	workspaceId: string,
	env: Env
): Promise<EncryptedBlob> {
	const key = await importAesKey(env);
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const encoded = new TextEncoder().encode(plaintext);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, additionalData: workspaceAad(workspaceId) },
		key,
		encoded
	);
	return {
		iv,
		ciphertext: new Uint8Array(ciphertext),
		keyVersion: CURRENT_KEY_VERSION
	};
}

export async function decryptSecret(
	blob: EncryptedBlob,
	workspaceId: string,
	env: Env
): Promise<string> {
	if (blob.keyVersion !== CURRENT_KEY_VERSION) {
		throw new Error(`Unsupported key version: ${blob.keyVersion}`);
	}
	const key = await importAesKey(env);
	const decrypted = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv: blob.iv,
			additionalData: workspaceAad(workspaceId)
		},
		key,
		blob.ciphertext
	);
	return new TextDecoder().decode(decrypted);
}
