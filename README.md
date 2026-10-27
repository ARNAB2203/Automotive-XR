# 3KNOT Automotive XR

A modular automotive configurator and virtual showroom platform with customer and administrative Next.js apps, a NestJS API, PostgreSQL/Prisma, and a separate Unreal rendering integration.

The runnable web demonstrator uses a clearly labelled schematic vehicle. Unreal project source and Pixel Streaming control-plane code are included; a licensed vehicle scene and real GPU/WebRTC validation are still required. See the [feature completion matrix](docs/completion-matrix.md) for precise status.

## Demo video

[![Watch the setup-to-execution demo](docs/demo/demo-preview.gif)](docs/demo/automotive-xr-demo.mp4)

**[Open/download the full demo — MP4, approximately 3 minutes](docs/demo/automotive-xr-demo.mp4)**

A captioned, silent recording of real local setup, database migrations and seed data, tests/builds, customer configuration, sign-in, save/share, dealer enquiries and admin execution. Uses synthetic data and the labelled schematic vehicle preview.

[Recording details and chapters](docs/demo/README.md) · [Copy-ready GitHub About settings and topics](docs/github-about.md)

## Start locally

Prerequisites: Node 22+, pnpm 11.25.0 and Docker Compose v2. From the existing checkout:

```bash
export POSTGRES_PASSWORD=local_dev_only
export DATABASE_URL=postgresql://automotive:local_dev_only@localhost:5432/automotive
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm build
pnpm dev:local
```

The password above is for loopback development only. Customer, admin and API use ports 3000, 3001 and 4000. The explicitly labelled local OIDC fixture runs on loopback port 5010 and offers development customer/admin identities. Never deploy that fixture publicly. Cloud runners with a read-only home should use `bash scripts/cloud-setup.sh` and the activation instructions in [local setup](docs/local-setup.md).

## Repository

- `apps/web`: customer experience and viewer adapters
- `apps/admin`: tenant administration and commercial workflows
- `apps/api`: catalog, authoritative pricing/compatibility, identity, configurations, leads and streaming sessions
- `packages/{ui,types,config,streaming-client}`: shared components, contracts, configuration and Epic frontend integration
- `unreal/AutomotiveXR`: UE 5.5 C++ project and primitive-scene Editor generator
- `infrastructure/streaming`: Redis fixed-pool allocator and signed signaling gateway
- `infrastructure/docker`: application images and Compose overlay
- `infrastructure/aws`: validated Terraform HTTP services and storage baseline
- `docs`: architecture, HLD/LLD, design, operations and validation evidence

## Verify

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:integration
```

Integration checks require PostgreSQL and Redis. Browser test build settings and commands are in [local setup](docs/local-setup.md). GitHub CI is supplied but has not been run on GitHub in this session.

## Design and documentation

- [Architecture / HLD](docs/architecture.md) and [LLD](docs/lld.md)
- [Figma handoff](docs/design/figma-handoff.md): editable SVG frames, tokens and actual application screenshots; no native Figma file is claimed
- [API reference](docs/api.md), [Unreal setup](docs/unreal-setup.md), [Pixel Streaming](docs/pixel-streaming.md)
- [Deployment](docs/deployment.md), [security](docs/security.md), [troubleshooting](docs/troubleshooting.md)
- [Validation evidence](docs/validation.md) and [original requirements](docs/product-requirements.md)
