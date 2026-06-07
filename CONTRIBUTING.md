# Contributing

This repository is public for transparency. It is **not** open-source — see [NOTICE](NOTICE). External contributions may not be accepted, but you are welcome to run, review, and report issues.

## Getting started

```bash
pnpm install
cp .dev.vars.example apps/bridge/.dev.vars
# Edit apps/bridge/.dev.vars
pnpm gen
pnpm dev
```

Local manifest: `http://localhost:5173/manifest`

## Quality gates

Run these before pushing:

```bash
pnpm lint      # oxfmt + oxlint + eslint
pnpm test      # vitest in all workspaces
pnpm check     # svelte-check type-check
```

CI runs the same checks on every push and pull request.

## Changelog

User-facing changes should include a changeset. From the repo root:

```bash
pnpm changeset
```

Pick the affected packages, choose a semver bump (patch/minor/major), and write a short summary. Commit the generated `.changeset/*.md` file with your PR.

After merge to `master`, CI opens a **chore: update changelog** PR that bumps versions and updates [`apps/bridge/CHANGELOG.md`](apps/bridge/CHANGELOG.md). Merge that PR to publish the changelog entry. Nothing is published to npm.

## Monorepo tooling

- **Dependency versions** are centralized in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) via [pnpm catalogs](https://pnpm.io/catalogs). Use `"catalog:"` in `package.json` instead of pinning versions directly.
- **Config dependencies** ([pnpm config deps](https://pnpm.io/config-dependencies)) are deferred until a second repo needs shared lint rules, security defaults, or patches. When that happens, extract tooling into an `@quantumly/pnpm-plugin-*` package rather than duplicating catalog entries.

## Code style

- Format with **oxfmt** (`pnpm format`). Do not add Prettier config.
- Lint with oxlint and ESLint (`pnpm lint`).
- TypeScript strict mode — no `any`, no `@ts-ignore`.
- RF invoice orchestration uses **Effect**; simpler paths use plain async/await.
- API JSON uses snake_case (`clockify_client_id`); TypeScript internals use camelCase.

## Project layout

| Path                        | Role                                          |
| --------------------------- | --------------------------------------------- |
| `apps/bridge/`              | SvelteKit app, API routes, Clockify iframe UI |
| `packages/invoice-core/`    | Invoice generation state machine              |
| `packages/request-finance/` | RF API client                                 |
| `packages/workspace-store/` | Durable Object persistence                    |
| `packages/db/`              | Drizzle schema and migrations                 |

## Tests

Tests live next to the code they cover (`*.test.ts`). Prefer testing handlers and business logic with mocked dependencies over asserting hardcoded literals.

Add tests when changing:

- Auth and crypto (`apps/bridge/src/lib/server/auth.ts`, `crypto.ts`)
- Invoice orchestration (`packages/invoice-core/`, `apps/bridge/src/lib/server/orchestrate.ts`)
- API routes (`apps/bridge/src/routes/api/`)

## Reporting issues

- Bugs: use the GitHub issue template.
- Security: email details privately — see [SECURITY.md](SECURITY.md).
