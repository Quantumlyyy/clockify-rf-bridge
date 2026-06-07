import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const clientMappings = sqliteTable('client_mappings', {
	clockifyClientId: text('clockify_client_id').primaryKey(),
	rfClientId: text('rf_client_id').notNull(),
	rfClientLabel: text('rf_client_label'),
	clockifyClientName: text('clockify_client_name'),
	updatedAt: text('updated_at').notNull()
});

export type ClientMappingRow = typeof clientMappings.$inferSelect;

export type ClientMapping = {
	clockify_client_id: string;
	rf_client_id: string;
	rf_client_label: string | null;
	clockify_client_name: string | null;
	updated_at: string;
};

export function toClientMapping(row: ClientMappingRow): ClientMapping {
	return {
		clockify_client_id: row.clockifyClientId,
		rf_client_id: row.rfClientId,
		rf_client_label: row.rfClientLabel,
		clockify_client_name: row.clockifyClientName,
		updated_at: row.updatedAt
	};
}
