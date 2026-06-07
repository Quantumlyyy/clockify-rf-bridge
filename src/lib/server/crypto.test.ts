import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from './crypto';

const TEST_KEK = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function mockEnv(kek = TEST_KEK): Env {
	return {
		KEK: {
			get: async () => kek
		}
	} as unknown as Env;
}

describe('crypto', () => {
	it('round-trips encrypt and decrypt', async () => {
		const env = mockEnv();
		const blob = await encryptSecret('secret-token', 'ws-123', env);
		const plain = await decryptSecret(blob, 'ws-123', env);
		expect(plain).toBe('secret-token');
	});

	it('fails decrypt with wrong AAD workspace', async () => {
		const env = mockEnv();
		const blob = await encryptSecret('secret-token', 'ws-123', env);
		await expect(decryptSecret(blob, 'ws-other', env)).rejects.toThrow();
	});

	it('fails decrypt with unsupported key version', async () => {
		const env = mockEnv();
		const blob = await encryptSecret('secret-token', 'ws-123', env);
		await expect(decryptSecret({ ...blob, keyVersion: 99 }, 'ws-123', env)).rejects.toThrow(
			/Unsupported key version/
		);
	});

	it('generates unique IVs', async () => {
		const env = mockEnv();
		const a = await encryptSecret('same', 'ws-1', env);
		const b = await encryptSecret('same', 'ws-1', env);
		const ivHex = (iv: Uint8Array) =>
			Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join('');
		expect(ivHex(a.iv)).not.toBe(ivHex(b.iv));
	});
});
