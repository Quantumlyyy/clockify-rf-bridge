/**
 * Wrangler entry point — hand-written on purpose.
 *
 * SvelteKit's Cloudflare adapter emits the fetch handler to
 * `.svelte-kit/cloudflare/_worker.js` during `pnpm build`. That file is
 * generated, minified, and gitignored under `.svelte-kit/`.
 *
 * This module re-exports that handler and exports Durable Object classes
 * required by wrangler.jsonc.
 */
export { WorkspaceStore } from '@clockify-rf-bridge/workspace-store/do';
export { default } from '../.svelte-kit/cloudflare/_worker.js';
