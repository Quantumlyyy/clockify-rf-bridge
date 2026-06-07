type Row = Record<string, unknown>;

export function createD1Mock(initial: Record<string, Row[]> = {}): D1Database {
	const tables = new Map<string, Row[]>();
	for (const [name, rows] of Object.entries(initial)) {
		tables.set(
			name,
			rows.map((r) => ({ ...r }))
		);
	}

	function table(name: string): Row[] {
		if (!tables.has(name)) tables.set(name, []);
		return tables.get(name)!;
	}

	return {
		prepare(sql: string) {
			let bound: unknown[] = [];
			return {
				bind(...args: unknown[]) {
					bound = args;
					return this;
				},
				async run() {
					const lower = sql.toLowerCase();
					if (lower.includes('insert into encrypted_secrets')) {
						const [workspace_id, token_type, iv, ciphertext, key_version, updated_at] = bound;
						const rows = table('encrypted_secrets');
						const idx = rows.findIndex(
							(r) => r.workspace_id === workspace_id && r.token_type === token_type
						);
						const row = {
							workspace_id,
							token_type,
							iv,
							ciphertext,
							key_version,
							updated_at
						};
						if (idx >= 0) rows[idx] = row;
						else rows.push(row);
					} else if (lower.includes('insert into invoice_mappings')) {
						table('invoice_mappings').push({
							workspace_id: bound[0],
							clockify_invoice_id: bound[1],
							rf_invoice_id: bound[2],
							rf_request_id: bound[3],
							payment_link: bound[4],
							created_at: bound[5]
						});
					} else if (lower.includes('delete from encrypted_secrets')) {
						const [workspace_id] = bound;
						table('encrypted_secrets').splice(
							0,
							table('encrypted_secrets').length,
							...table('encrypted_secrets').filter((r) => r.workspace_id !== workspace_id)
						);
					} else if (lower.includes('delete from invoice_mappings')) {
						const [workspace_id] = bound;
						table('invoice_mappings').splice(
							0,
							table('invoice_mappings').length,
							...table('invoice_mappings').filter((r) => r.workspace_id !== workspace_id)
						);
					}
					return { success: true, meta: {} };
				},
				async first<T>(): Promise<T | null> {
					const lower = sql.toLowerCase();
					if (lower.includes('from encrypted_secrets')) {
						const [workspace_id, token_type] = bound;
						const row = table('encrypted_secrets').find(
							(r) => r.workspace_id === workspace_id && r.token_type === token_type
						);
						if (!row) return null;
						if (lower.includes('select 1 as ok')) {
							return { ok: 1 } as T;
						}
						return row as T;
					}
					if (lower.includes('from invoice_mappings')) {
						const [workspace_id, clockify_invoice_id] = bound;
						const row = table('invoice_mappings').find(
							(r) =>
								r.workspace_id === workspace_id && r.clockify_invoice_id === clockify_invoice_id
						);
						return (row as T) ?? null;
					}
					return null;
				},
				async all<T>() {
					return { results: [] as T[], success: true };
				}
			};
		},
		batch: async () => [],
		exec: async () => ({ count: 0, duration: 0 })
	} as unknown as D1Database;
}
