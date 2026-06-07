# Clockify ↔ Request Finance Bridge

Cloudflare Workers add-on that creates a Request Finance USDC crypto invoice from a saved Clockify invoice and writes the payment link into the Clockify invoice note.

## Stack

- SvelteKit + `@sveltejs/adapter-cloudflare`
- D1 (`persistence`) via Drizzle ORM, KV (`cache`), Secrets Store (`KEK` → `RF_KEK`)
- Runtime dependencies: `drizzle-orm`, `jose` (JWT verification)

## Local development

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars: ADDON_KEY, RF_KEK (64-char hex)

pnpm install
pnpm gen
wrangler d1 migrations apply persistence --local
pnpm dev
```

Manifest URL (local): `http://localhost:5173/manifest`

## Database

Schema is defined in [`src/lib/server/db/schema.ts`](src/lib/server/db/schema.ts) using Drizzle ORM. Migrations live in [`migrations/`](migrations/) and are applied with Wrangler:

```bash
wrangler d1 migrations apply persistence --local   # dev
wrangler d1 migrations apply persistence --remote  # production
```

After changing the schema, generate a new migration:

```bash
pnpm db:generate
```

For quick local schema iteration (without migration files), `pnpm db:push` pushes directly to a remote D1 via the HTTP API. It requires `.env` vars: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`.

## Secrets

| Secret                 | Where                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| `RF_KEK`               | Secrets Store (production) or `.dev.vars` (local)                 |
| `ADDON_KEY`            | `wrangler.jsonc` `vars` / `.dev.vars` — served as manifest `key` via `GET /manifest` |
| Clockify install token | Encrypted in D1 on `INSTALLED` lifecycle                          |
| RF API token           | Admin enters via `/self-hosted-settings` → encrypted in D1        |

## Crawling

`static/robots.txt` disallows all crawlers. This deployment is a Clockify add-on backend (iframes and API routes), not a public marketing site — blocking indexing is intentional.

## Deploy

```bash
pnpm build
wrangler d1 migrations apply persistence --remote
wrangler deploy
```

## API routes

| Route                    | Purpose                           |
| ------------------------ | --------------------------------- |
| `GET /manifest`          | Add-on manifest                   |
| `POST /lifecycle`        | Install / settings / delete hooks |
| `POST /api/generate`     | Create + issue RF invoice         |
| `GET/POST /api/rf-token` | RF API token intake (admin)       |
| `GET /api/context`       | Non-secret UI defaults            |

## Iframe pages

- `/invoices/action` — create RF invoice (single invoice)
- `/self-hosted-settings` — RF API token (admin)

## Tests

```bash
pnpm test
pnpm lint
pnpm build
```
