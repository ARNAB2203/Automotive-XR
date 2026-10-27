# Deployment and build process

## Local containers

From the repository root, export `POSTGRES_PASSWORD` and a generated `SHARE_SIGNING_KEY` (at least 32 characters). OIDC configuration is optional for public catalog browsing and required for protected APIs.

```bash
docker compose -f docker-compose.yml -f infrastructure/docker/apps.compose.yml build
docker compose -f docker-compose.yml -f infrastructure/docker/apps.compose.yml up -d postgres redis --wait
docker compose -f docker-compose.yml -f infrastructure/docker/apps.compose.yml run --rm api node node_modules/tsx/dist/cli.mjs prisma/migrate.ts
# Development only:
docker compose -f docker-compose.yml -f infrastructure/docker/apps.compose.yml run --rm api node node_modules/tsx/dist/cli.mjs prisma/seed.ts
docker compose -f docker-compose.yml -f infrastructure/docker/apps.compose.yml up -d --wait
```

The Dockerfile builds all workspaces, then exposes distinct api/web/admin targets as the unprivileged node user. The initial image prioritizes reproducibility over size and retains development tools for explicit migration jobs; split migration and production images before a large-scale deployment. Build-time `NEXT_PUBLIC_*` values are embedded by Next.js and require a rebuild when changed.

## AWS baseline

`infrastructure/aws/main.tf` and `services.tf` provide private/versioned/encrypted S3, TLS-only bucket access, immutable ECR repositories, CloudWatch logs, three ECS Fargate HTTP services behind a TLS ALB, scoped secret injection and deployment circuit breakers. Supply region, globally unique bucket name and tags; use reviewed remote Terraform state with locking. Run `terraform init`, `terraform validate`, `terraform plan` before applying. No apply has been run and no production service is deployed.

Operators must supply an existing VPC with public/private subnets and suitable private egress, RDS PostgreSQL with TLS/backups and an application user, Redis, DNS records, an ACM certificate, OIDC, managed secret ARNs, and a separately operated GPU fleet. Set `images` to immutable digests and `domains` to api/web/admin hostnames. Permit database ingress only from the output application security group. Terraform source is validated but no services have been deployed. GPU autoscaling is absent.

## Release sequence

1. Run CI unit, integration and browser checks, dependency review and image scans.
2. Build immutable image tags from the reviewed commit and public environment configuration.
3. Back up the database. Execute the SQL migration command once as a controlled job with a migration-capable role.
4. Roll the API and verify `/ready`, catalog pricing, tenant authorization and a saved configuration.
5. Roll customer/admin apps and verify OIDC redirect registrations and CORS origins.
6. Promote a separately licensed and packaged UE scene to a matching signaling/GPU worker. Validate TURN and session cleanup before exposing live streaming.
7. Observe error rate, latency and lead handling. Roll back application images on failure; data migrations require a reviewed recovery plan, not blind rollback.

GitHub Actions workflow is supplied. Local checks are recorded separately; no hosted CI run or AWS deployment has been observed.

In managed cloud environments, pass the host trust bundle as `docker build --secret id=ca-certificates,src=/etc/ssl/certs/ca-certificates.crt ...`; this preserves TLS verification. The bundle is a build secret and is not copied into image layers.
