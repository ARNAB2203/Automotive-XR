#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Automotive-XR
export XDG_DATA_HOME=/workspace/.local/share
export XDG_CACHE_HOME=/workspace/.cache
export XDG_CONFIG_HOME=/workspace/.config
export PATH=/workspace/.local/share/pnpm/bin:$PATH
mkdir -p /workspace/.local/share/pnpm/bin
pnpm config set store-dir /workspace/.pnpm-store --global
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-local_dev_only}"
export DATABASE_URL="${DATABASE_URL:-postgresql://automotive:local_dev_only@localhost:5432/automotive}"
CI=true pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm build
