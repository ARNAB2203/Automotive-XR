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

## Phase 2

- Eight Vitest unit tests passed, covering option/category validation, incompatible combinations, missing prices, integer totals and share signatures.
- Built NestJS API passed 18 integration checks against real PostgreSQL and a temporary RS256 OIDC issuer. Checks covered tenant-scoped catalog/pricing, rejected client totals, unauthenticated and unauthorized access, wrong JWT audience, cross-tenant write denial, save/retrieve/share, share tampering, dealer isolation, consent and lead retrieval, and audit records. Fixtures are removed after the run.
