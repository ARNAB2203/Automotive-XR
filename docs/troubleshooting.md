# Troubleshooting

- Catalog unavailable: run `docker compose ps`, export `DATABASE_URL`, then `pnpm db:migrate` and `pnpm db:seed`; check API `/ready` and `/public/3knot/vehicles`.
- Sign-in not configured: use `pnpm dev:local` for the loopback development identity flow, or register a real OIDC public client and set both server and `NEXT_PUBLIC_*` values. Rebuild production Next.js bundles after public settings change.
- 401 after sign-in: confirm issuer, audience and the token's `tenant_id` plus subject membership. Inspect variable presence only; do not dump bearer tokens or credential files.
- 403 in admin: customer accounts cannot administer a tenant. The local issuer has an explicitly labelled tenant-admin choice for development.
- Invalid combination: choose the server-specified required option. Never change the client to accept incompatible options or submitted totals. Default selections come from a bounded backend compatibility search.
- Database password mismatch: existing Compose volumes retain initial credentials. Reuse the original password; do not delete volumes containing user data to force setup through.
- Prisma engine fetch blocked: this repository uses the JavaScript query engine and PostgreSQL adapter. Do not disable engine checksum verification. SQL migrations use the documented `_xr_migrations` runner, not `prisma migrate deploy`.
- Migration checksum mismatch: do not edit an applied migration. Restore the original SQL or add a reviewed new migration. The migration runner currently accepts ordinary DDL, not procedural bodies with embedded semicolons.
- Cloud home directory read-only: set writable XDG paths and use the documented pnpm store argument. For Docker buildx, set `DOCKER_CONFIG=/workspace/.docker`.
- TLS verification inside a tool container: mount the trusted host certificate directory read-only, or use the Dockerfile's optional `ca-certificates` BuildKit secret. Never disable TLS checks.
- Live viewer unavailable: confirm allocator config and keys, fixed GPU capacity, worker signaling health and actual UE readiness. The fallback remains schematic.
- Browser test download denied: use an installed Chromium with `CHROMIUM_PATH=/usr/bin/chromium`, or allow the official Playwright browser CDN through environment settings. No checksum/TLS bypass is supported.
