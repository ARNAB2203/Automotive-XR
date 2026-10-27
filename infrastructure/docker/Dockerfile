# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
RUN --mount=type=secret,id=ca-certificates,required=false \
    if [ -f /run/secrets/ca-certificates ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca-certificates; fi; npm install --global pnpm@11.25.0
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_OIDC_ISSUER
ARG NEXT_PUBLIC_OIDC_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_OIDC_ISSUER=$NEXT_PUBLIC_OIDC_ISSUER NEXT_PUBLIC_OIDC_CLIENT_ID=$NEXT_PUBLIC_OIDC_CLIENT_ID NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=ca-certificates,required=false \
    if [ -f /run/secrets/ca-certificates ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca-certificates; fi; pnpm install --frozen-lockfile && pnpm db:generate && pnpm build
FROM node:22-bookworm-slim AS runtime
COPY --from=build --chown=node:node /app /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
USER node
FROM runtime AS api
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node","dist/main.js"]
FROM runtime AS web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node","node_modules/next/dist/bin/next","start","--hostname","0.0.0.0","--port","3000"]
FROM runtime AS admin
WORKDIR /app/apps/admin
EXPOSE 3001
CMD ["node","node_modules/next/dist/bin/next","start","--hostname","0.0.0.0","--port","3001"]
