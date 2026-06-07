import { codecovSvelteKitPlugin } from '@codecov/sveltekit-plugin';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit(),
		codecovSvelteKitPlugin({
			enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
			bundleName: 'bridge',
			uploadToken: process.env.CODECOV_TOKEN
		})
	],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			reportsDirectory: './coverage'
		},
		...(process.env.CI && {
			reporters: ['default', 'junit'],
			outputFile: './test-results/junit.xml'
		}),
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
