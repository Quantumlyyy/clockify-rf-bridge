import { customType } from 'drizzle-orm/sqlite-core';

function blobToUint8Array(value: unknown): Uint8Array {
	if (value instanceof Uint8Array) return value;
	if (value instanceof ArrayBuffer) return new Uint8Array(value);
	if (ArrayBuffer.isView(value)) {
		return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
	}
	throw new Error('Expected blob value');
}

/** Workers-safe blob column — avoids Drizzle's buffer mode, which requires Node's `Buffer`. */
export const uint8Blob = customType<{ data: Uint8Array; driverData: Uint8Array }>({
	dataType() {
		return 'blob';
	},
	fromDriver: blobToUint8Array,
	toDriver: (value) => value
});
