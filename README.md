# 3KNOT Automotive XR

A modular automotive configurator and virtual showroom. See [local setup](docs/local-setup.md), [architecture](docs/architecture.md), and [feature status](docs/completion-matrix.md).

## Repository

- `apps/web`: customer Next.js application (3000)
- `apps/admin`: administrative Next.js application (3001)
- `apps/api`: NestJS REST service (4000)
- `packages/{ui,types,config,streaming-client}`: shared modules
- `unreal/AutomotiveXR`: Unreal rendering source
- `infrastructure`: local and production infrastructure
- `docs`: architecture, design and operations

No production deployment or GPU rendering is implied by a successful web build.
