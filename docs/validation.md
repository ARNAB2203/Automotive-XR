# Validation evidence

Local command outcomes are recorded here as checks complete. GitHub CI execution and AWS/GPU deployment have not been performed.

## Phase 1

- `pnpm install`: passed with explicit dependency build allowlist.
- `pnpm db:generate`: passed with JavaScript client engine.
- `pnpm db:migrate` twice: initial SQL applied, second invocation made no changes.
- `pnpm db:seed` twice: passed, idempotent catalog data.
- `pnpm typecheck`: all seven workspaces passed.
- `pnpm test`: one initial validation test passed (expanded later).
- `pnpm build`: all seven workspaces passed, including both production Next.js builds.
- Started built API, web, admin; health JSON and both home HTML responses passed.
- PostgreSQL and Redis Compose health checks passed.
- Native Prisma engine download was denied; no signature/checksum verification was disabled. Supported JS client engine avoids that dependency. Prisma CLI JS `migrate deploy` failed on unsupported PostgreSQL metadata; the documented SQL runner passed instead.
