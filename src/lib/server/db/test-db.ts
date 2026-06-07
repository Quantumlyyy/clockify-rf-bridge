import { createDb } from './index';
import { createD1Mock } from './d1-mock';

/** In-memory D1 for unit tests — uses the same drizzle-orm/d1 path as production. */
export function createTestDb() {
	return createDb(createD1Mock());
}

export type TestDb = ReturnType<typeof createTestDb>;
