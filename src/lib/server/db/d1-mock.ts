type Row = Record<string, unknown>;

function normalizeSql(sql: string): string {
	return sql.toLowerCase().replace(/"/g, '');
}

export function createD1Mock(initial: Record<string, Row[]> = {}): D1Database {
	const tables = new Map<string, Row[]>();
	for (const [name, rows] of Object.entries(initial)) {
		tables.set(name, rows.map((row) => ({ ...row })));
	}

	function table(name: string): Row[] {
		if (!tables.has(name)) tables.set(name, []);
		return tables.get(name)!;
	}

	function upsertSecret(bound: unknown[]): void {
		const [workspace_id, token_type, iv, ciphertext, key_version, updated_at] = bound.slice(0, 6);
		const rows = table('encrypted_secrets');
		const idx = rows.findIndex(
			(r) => r.workspace_id === workspace_id && r.token_type === token_type
		);
		const row = { workspace_id, token_type, iv, ciphertext, key_version, updated_at };
		if (idx >= 0) rows[idx] = row;
		else rows.push(row);
	}

	function selectSecrets(bound: unknown[], columns: string[]): Row[] {
		const [workspace_id, token_type] = bound;
		const row = table('encrypted_secrets').find(
			(r) => r.workspace_id === workspace_id && r.token_type === token_type
		);
		if (!row) return [];
		return [pickColumns(row, columns)];
	}

	function pickColumns(row: Row, columns: string[]): Row {
		const picked: Row = {};
		for (const col of columns) picked[col] = row[col];
		return picked;
	}

	function parseSelectColumns(sql: string): string[] {
		const match = sql.match(/select (.+?) from/);
		if (!match) return [];
		return match[1].split(',').map((col) => col.trim());
	}

	return {
		prepare(sql: string) {
			const normalized = normalizeSql(sql);
			let bound: unknown[] = [];

			const stmt = {
				bind(...args: unknown[]) {
					bound = args;
					return stmt;
				},
				async run() {
					if (normalized.includes('insert into encrypted_secrets')) {
						upsertSecret(bound);
					} else if (normalized.includes('insert into invoice_mappings')) {
						const [
							workspace_id,
							clockify_invoice_id,
							rf_invoice_id,
							rf_request_id,
							payment_link,
							created_at
						] = bound;
						table('invoice_mappings').push({
							workspace_id,
							clockify_invoice_id,
							rf_invoice_id,
							rf_request_id,
							payment_link,
							created_at
						});
					} else if (normalized.includes('delete from encrypted_secrets')) {
						const [workspace_id] = bound;
						const rows = table('encrypted_secrets');
						tables.set(
							'encrypted_secrets',
							rows.filter((r) => r.workspace_id !== workspace_id)
						);
					} else if (normalized.includes('delete from invoice_mappings')) {
						const [workspace_id] = bound;
						const rows = table('invoice_mappings');
						tables.set(
							'invoice_mappings',
							rows.filter((r) => r.workspace_id !== workspace_id)
						);
					}
					return { success: true, meta: {} };
				},
				async first<T>(): Promise<T | null> {
					const rows = await stmt.all<T>();
					return rows.results[0] ?? null;
				},
				async all<T>(): Promise<D1Result<T>> {
					let results: T[] = [];

					if (normalized.includes('from encrypted_secrets')) {
						const columns = parseSelectColumns(normalized);
						results = selectSecrets(bound, columns) as T[];
					} else if (normalized.includes('from invoice_mappings')) {
						const [workspace_id, clockify_invoice_id] = bound;
						const row = table('invoice_mappings').find(
							(r) =>
								r.workspace_id === workspace_id &&
								r.clockify_invoice_id === clockify_invoice_id
						);
						if (row) results = [row as T];
					}

					return { results, success: true, meta: {} };
				},
				async raw() {
					const { results } = await stmt.all();
					return results.map((row) => Object.values(row as Row));
				}
			};

			return stmt;
		},
		batch: async () => [],
		exec: async () => ({ count: 0, duration: 0 })
	} as unknown as D1Database;
}
