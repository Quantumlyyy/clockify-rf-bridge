# Clockify ↔ Request Finance Bridge

Cloudflare Workers add-on that creates a Request Finance USDC crypto invoice from a saved Clockify invoice and writes the payment link into the Clockify invoice note.

## Monorepo layout

```
apps/bridge/                         SvelteKit + Cloudflare Workers app
packages/request-finance/            Effect Schema + RF HTTP client (no business logic)
packages/db/                         Drizzle schema + DO SQLite migrations
packages/workspace-store/            Per-workspace Durable Object + RPC client
packages/invoice-core/               Effect invoice orchestration state machine
```

## Stack

- SvelteKit + `@sveltejs/adapter-cloudflare`
- Durable Objects (`WORKSPACE`) with Drizzle `durable-sqlite` — one `WorkspaceStore` per Clockify workspace
- KV (`cache`), Secrets Store (`KEK` → `RF_KEK`)
- Effect + Effect Schema for RF client and invoice flow

## Local development

```bash
cp .dev.vars.example apps/bridge/.dev.vars
# Edit apps/bridge/.dev.vars: ADDON_KEY, RF_KEK (64-char hex)

pnpm install
pnpm gen
pnpm dev
```

Manifest URL (local): `http://localhost:5173/manifest`

## Workspace persistence

All workspace-scoped data lives in a `WorkspaceStore` Durable Object keyed by `idFromName(workspaceId)`:

| Table               | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `encrypted_secrets` | Clockify install token + RF API token (encrypted)              |
| `invoice_mappings`  | Idempotency — completed invoice → RF payment link              |
| `invoice_runs`      | In-flight orchestration state for resume after partial failure |

Schema: [`packages/db/src/schema.ts`](packages/db/src/schema.ts). Migrations run automatically inside each DO on first access.

## D1 → DO migration (production)

If you have existing data in the old D1 `persistence` database:

1. Export `encrypted_secrets` and `invoice_mappings` grouped by `workspace_id`.
2. For each workspace, call the `WorkspaceStore` stub (`env.WORKSPACE.get(idFromName(workspaceId))`) to seed tokens and mappings via the `/token` and `/mapping` RPC routes.
3. Remove the D1 binding once verified.

Dev/local environments can start fresh — no migration needed.

## Secrets

| Secret                 | Where                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| `RF_KEK`               | Secrets Store (production) or `apps/bridge/.dev.vars` (local)        |
| `ADDON_KEY`            | `apps/bridge/wrangler.jsonc` `vars` / `.dev.vars`                    |
| Clockify install token | Encrypted in workspace DO on `INSTALLED` lifecycle                   |
| RF API token           | Admin enters via `/self-hosted-settings` → encrypted in workspace DO |

## Scripts

| Command            | Description                                   |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Start bridge dev server                       |
| `pnpm build`       | Build all packages + bridge                   |
| `pnpm test`        | Run tests in all workspaces                   |
| `pnpm db:generate` | Generate DO SQLite migration in `packages/db` |
| `pnpm gen`         | Regenerate Wrangler types                     |

## Deploy

```bash
pnpm build
wrangler deploy --config apps/bridge/wrangler.jsonc
```

The worker entry is [`apps/bridge/src/worker.ts`](apps/bridge/src/worker.ts) — a small hand-written module that re-exports the SvelteKit handler from `.svelte-kit/cloudflare/_worker.js` (generated on `pnpm build`, gitignored) and exports the `WorkspaceStore` Durable Object class.

## Package boundaries

- **`@clockify-rf-bridge/request-finance`** — rnf_invoice 0.0.3 schemas, API extensions (`attachments`, `paymentOptions`, etc.), typed HTTP only.
- **`@clockify-rf-bridge/invoice-core`** — state machine; Clockify client injected from bridge.
- **`@clockify-rf-bridge/workspace-store`** — DO actor + fetch-based RPC client used by bridge routes.
