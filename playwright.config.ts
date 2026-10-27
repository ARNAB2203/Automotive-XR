import { defineConfig } from "@playwright/test";
const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://automotive:local_dev_only@localhost:5432/automotive",
  OIDC_ISSUER: "http://127.0.0.1:5010",
  OIDC_AUDIENCE: "automotive-xr",
  NEXT_PUBLIC_OIDC_ISSUER: "http://127.0.0.1:5010",
  NEXT_PUBLIC_OIDC_CLIENT_ID: "automotive-xr-local",
  SHARE_SIGNING_KEY:
    process.env.SHARE_SIGNING_KEY ?? "local-e2e-only-signing-key-do-not-deploy",
};
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  webServer: [
    {
      command: "pnpm --filter @xr/api start",
      url: "http://localhost:4000/ready",
      env,
      timeout: 30000,
    },
    {
      command: "pnpm --filter @xr/api dev:identity",
      url: "http://127.0.0.1:5010/.well-known/openid-configuration",
      env,
      timeout: 30000,
    },
    {
      command: "pnpm --filter @xr/web start",
      url: "http://localhost:3000",
      env,
      timeout: 30000,
    },
    {
      command: "pnpm --filter @xr/admin start",
      url: "http://localhost:3001",
      env,
      timeout: 30000,
    },
  ],
});
