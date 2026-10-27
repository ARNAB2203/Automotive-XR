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

## Final application validation

- ESLint and Prettier checks passed; eight package build tasks passed (including gateway syntax validation).
- Eleven Vitest tests passed: pricing/compatibility/defaults, signed sharing and protocol input validation.
- PostgreSQL + RS256 OIDC integration passed 19 checks before expanded management tests. Final expanded results are recorded below.
- Redis/WebSocket allocator integration passed: authenticated allocation, idempotent allocation, capacity rejection, denied mismatched session token, signaling forwarding, heartbeat and idempotent release. This is not a GPU/WebRTC test.
- Three Chromium workflows passed: catalog/pricing/incompatible-option handling, OIDC PKCE save/share/garage; lead submission visible in admin plus vehicle create/archive; mobile overflow and screenshots. A default-selection bug found by the initial browser run was corrected in the backend. A test locator was also scoped to exclude Next.js's route announcer.
- Local sequential pricing benchmark (20 requests): p50 8.5 ms, p95 15.2 ms in one recorded run. This is not a production throughput or latency guarantee.
- Terraform 1.10.5 formatting and validation passed with the signed HashiCorp AWS provider 5.100.0. No AWS credentials, plan/apply or hosted deployment were used. The container trust store was supplied from the trusted host bundle; verification stayed enabled.
- Clean Docker builder completed dependency installation, explicit Prisma generation and all workspace builds. API container `/ready` and catalog reads worked against Compose PostgreSQL. Native engine download fallback was removed by supplying a syntactically valid nonconnecting datasource URL for generation. Generation was also verified with native engine files temporarily removed and then restored.
- Local cloud setup script completed install, service health checks, generation, repeatable migrations/seed and production builds.

Unreal compilation, generated map/Blueprint authoring, licensed asset validation, real GPU/WebRTC/TURN tests, telemetry collector delivery, hosted GitHub CI and AWS deployment remain unrun. The native Figma document was not created; portable design artifacts and actual application screenshots are supplied.

Final expanded management suite: **25 API integration checks passed**, plus the Redis/WebSocket integration test. Final Chromium run: **3 passed**, including OIDC return-to-configuration with preserved selections.

## Development startup and final boundaries

- `pnpm dev:local` was exercised with the writable cloud tool configuration. API DB readiness and public catalog passed. Browser smoke verified customer PKCE sign-in, save and server-rendered share retrieval; admin PKCE sign-in and inactive price-book create/delete also passed.
- Explicit NestJS injection declarations fixed the development runner's lack of emitted constructor metadata. Server-rendered web requests use `API_URL`, while browser requests use `NEXT_PUBLIC_API_URL`; the Compose web service supplies its internal API address.
- A later clean image rebuild encountered external npm/Docker registry HTTP 503 responses. Earlier clean build and API container DB/catalog smoke passed; this transient network failure is distinct from application checks. No deployment or fresh external restoration is inferred from saved setup configuration.
- Reusable `install_script` and `start_skill` were saved to the environment draft. Saving does not publish the environment or restart future tasks.

The latest production artifacts were subsequently built using the previously verified dependency image to avoid the registry outage. Disposable containers passed API database readiness, customer/admin HTML, vehicle detail SSR and signed configuration SSR with the internal `API_URL`. Both application commands ran from the same verified artifact image with their respective working directories and ports. The retained-dependency build does not establish that the external registry outage has cleared. All disposable validation containers were stopped; the documented development stack remains running.
