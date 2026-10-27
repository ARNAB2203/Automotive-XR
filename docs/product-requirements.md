# MASTER IMPLEMENTATION PROMPT — 3KNOT Automotive XR

You are a Principal Software Architect, Senior Unreal Engine Developer, Full-Stack Engineer, DevOps Engineer and Automotive 3D Technical Artist.

Build a production-oriented, modular automotive 3D configurator and virtual showroom platform named **3KNOT Automotive XR**.

## Project objective

Develop a multi-tenant B2B automotive platform that allows users to:

1. Explore a photorealistic 3D vehicle.
2. Rotate, zoom and inspect the exterior and interior.
3. Customize vehicle paint, wheels, upholstery and trim.
4. Switch between daytime, nighttime and studio environments.
5. View valid option combinations and authoritative pricing.
6. Save, share and retrieve configurations.
7. Request quotations and schedule test-drive enquiries.
8. Explore a virtual automotive showroom.
9. Manage vehicles, variants, pricing, leads and dealers through an admin dashboard.
10. Access the Unreal Engine experience through a local kiosk or browser-based Pixel Streaming session.

## Required technology stack

- Monorepo: pnpm workspaces + Turborepo
- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: NestJS, TypeScript, REST APIs, Swagger/OpenAPI
- Database: PostgreSQL with Prisma ORM
- Cache: Redis
- Authentication: OIDC-compatible authentication with role-based access control
- 3D: Unreal Engine 5, Blueprints, C++, Variant Manager
- Browser rendering: Unreal Engine Pixel Streaming and WebRTC
- Object storage: S3-compatible storage
- Infrastructure: Docker Compose for local services, AWS for production
- CI/CD: GitHub Actions
- Testing: Vitest/Jest, Playwright, API integration tests
- Monitoring: OpenTelemetry, structured logs and Sentry-compatible error reporting

## Architecture principles

Use a modular architecture with strict separation between:

- Unreal Engine rendering and visual state
- Business configuration rules
- Vehicle catalog and pricing
- Customer identity and authorization
- Dealer and tenant management
- Streaming session orchestration
- Lead capture and analytics

The backend is the authoritative source for option compatibility and prices. Never calculate trusted commercial prices exclusively in the browser or Unreal Engine.

Use tenant-scoped database queries and enforce authorization on every protected API route.

## Customer web application

Implement these routes:

- `/` — Landing page
- `/vehicles` — Vehicle catalog
- `/vehicles/[slug]` — Vehicle details
- `/configure/[vehicleId]` — Interactive configurator
- `/showroom` — Virtual showroom
- `/my-configurations` — Saved configurations
- `/configuration/[shareId]` — Shared configuration
- `/contact` — Dealer enquiries

Configurator requirements:

- Vehicle model selector
- 360-degree exterior camera
- Interior camera presets
- Exterior paint selection
- Wheel and upholstery selection
- Trim compatibility validation
- Dynamic pricing from backend
- Configuration summary
- Save and share actions
- Quotation enquiry form
- Test-drive enquiry form
- Loading states, error handling and mobile-responsive UI

Implement a reusable `VehicleViewer` abstraction with two adapters:

1. `PixelStreamingViewer` for Unreal Engine streaming.
2. `FallbackViewer` for static vehicle images and configuration previews.

Do not represent the fallback viewer as photorealistic Unreal rendering.

## Admin dashboard

Implement:

- Tenant administration
- Vehicle model CRUD
- Variant and option management
- Option compatibility rules
- Price-book management
- Dealer management
- Customer lead management
- Saved configuration lookup
- Streaming session monitoring
- Basic conversion analytics
- User and role administration
- Audit logs

Roles:

- Platform Admin
- Tenant Admin
- Dealer Manager
- Sales Representative
- Customer

## Backend API

Implement documented REST endpoints for:

- Authentication and users
- Tenants
- Vehicles
- Variants and options
- Compatibility validation
- Pricing
- Configurations
- Dealers
- Leads
- Streaming sessions
- Analytics

Use Zod or class-validator for input validation and consistent API error responses.

Generate OpenAPI documentation and provide realistic development seed data.

## Database design

Create Prisma models for:

- Tenant
- User
- UserRole
- VehicleModel
- VehicleVariant
- VehicleOption
- OptionCompatibilityRule
- PriceBook
- PriceBookEntry
- VehicleConfiguration
- Dealer
- CustomerLead
- StreamingSession
- AuditEvent

Include migrations, indexes, foreign keys, tenant isolation and seed scripts.

## Unreal Engine implementation

Create an Unreal project named `AutomotiveXR`.

Use the official Product Configurator concepts as the foundation.

Implement:

- Configurable vehicle actor
- Material and geometry variants
- Blueprint functions for applying configuration
- Exterior and interior camera controls
- Environment lighting presets
- Camera transitions
- Door and component animations where assets support them
- Configuration state synchronization
- Pixel Streaming input commands
- Stable message contracts between Unreal and web frontend

Define a versioned JSON protocol for messages such as:

- `SET_PAINT`
- `SET_WHEELS`
- `SET_INTERIOR`
- `SET_CAMERA`
- `SET_ENVIRONMENT`
- `RESET_CONFIGURATION`
- `CONFIGURATION_UPDATED`
- `VIEWER_READY`
- `VIEWER_ERROR`

Validate all messages and use acknowledgements where appropriate.

Do not assume an automotive CAD model is available. Build the first demonstrator with an appropriately licensed sample vehicle or clearly labeled placeholder.

## Pixel Streaming infrastructure

Implement:

- Streaming frontend integration
- Session request API
- Signalling server integration
- Session allocation abstraction
- Heartbeats
- Idle session expiration
- Session cleanup
- GPU capacity limits
- Secure viewer access
- TURN/STUN configuration
- Error and reconnect handling
- Basic operational metrics

Do not claim GPU auto-scaling is implemented unless functional infrastructure code and deployment tests exist.

## Security

Implement:

- Tenant isolation
- RBAC
- Secure authentication
- Rate limiting
- Input validation
- Secure secret handling
- Restricted CORS
- Audit logging
- Signed sharing identifiers
- Secure streaming-session tokens
- No committed credentials
- Privacy-conscious lead collection

## Required repository structure

Create:

```text
automotive-xr/
├── apps/
│   ├── web/
│   ├── admin/
│   └── api/
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   └── streaming-client/
├── unreal/
│   └── AutomotiveXR/
├── infrastructure/
│   ├── docker/
│   ├── aws/
│   └── streaming/
├── docs/
│   ├── architecture.md
│   ├── local-setup.md
│   ├── unreal-setup.md
│   ├── pixel-streaming.md
│   ├── api.md
│   ├── deployment.md
│   ├── security.md
│   └── troubleshooting.md
├── .github/workflows/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
└── README.md
```

## Implementation phases

**Phase 1 — Foundation:** Create monorepo, application scaffolding, linting, formatting, environment configuration, database, migrations and CI.

**Phase 2 — Backend:** Implement catalog, variants, compatibility rules, pricing, authentication, configurations and lead APIs.

**Phase 3 — Frontend:** Build responsive landing page, vehicle catalog, configurator UI, saved configurations and dealer enquiries.

**Phase 4 — Admin:** Implement vehicle management, pricing, dealer and lead management.

**Phase 5 — Unreal Engine:** Build a working vehicle scene, cameras, materials, variants and interaction protocol.

**Phase 6 — Pixel Streaming:** Integrate the web viewer with a running Unreal application, including session lifecycle handling.

**Phase 7 — Testing:** Add automated tests, security checks, performance benchmarks and integration tests.

**Phase 8 — Documentation and deployment:** Complete setup guides, production deployment configuration, sample data and GitHub Actions workflows.

## Required deliverables

Produce actual source code, not pseudocode or UI mockups alone.

Include:

1. Executable frontend and backend applications.
2. Prisma schema and migrations.
3. Seed data.
4. Unreal project source and required configuration.
5. Streaming integration.
6. Docker Compose setup.
7. `.env.example` files.
8. GitHub Actions CI workflows.
9. API documentation.
10. Developer onboarding and deployment guides.
11. Automated tests.
12. A feature completion matrix.

For every implementation phase:

- Create the necessary files.
- Explain how to run them.
- Run available tests and builds.
- Fix errors before proceeding.
- Commit logically separated changes.
- Record limitations and incomplete work.

Never fabricate test results, Unreal assets, GPU validation, deployment status or completed integrations.

## Definition of done

The MVP is complete only when:

- A developer can start the web, admin and API applications using documented steps.
- Database migrations and seed scripts work.
- A user can browse vehicles and save a valid configuration.
- Pricing and compatibility rules are enforced by the backend.
- An administrator can manage the product catalog.
- A lead can be submitted and viewed in the admin dashboard.
- A licensed vehicle scene runs in Unreal Engine.
- A compatible Pixel Streaming setup has been tested with a real Unreal runtime and GPU.
- Documentation matches the actual implementation.
- CI passes.
- Known limitations are clearly recorded.

Begin with Phase 1. Present the repository structure and architecture decisions, then implement and validate the foundation before proceeding to the next phase.
