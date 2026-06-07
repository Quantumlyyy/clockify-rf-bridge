import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: ['./src/tables/*.ts'],
	out: './migrations',
	dialect: 'sqlite'
});
