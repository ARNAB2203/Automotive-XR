// Explicit loopback-only development identity flow. Never use for production.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (process.env.NODE_ENV === "production")
  throw new Error("Local development launcher is disabled in production");
if (existsSync(".env")) process.loadEnvFile(".env");
mkdirSync(".local", { recursive: true });
if (!existsSync(".local/share-signing-key"))
  writeFileSync(".local/share-signing-key", randomBytes(32).toString("hex"), {
    mode: 0o600,
    flag: "wx",
  });
const env = {
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://automotive:local_dev_only@localhost:5432/automotive",
  SHARE_SIGNING_KEY:
    process.env.SHARE_SIGNING_KEY ||
    readFileSync(".local/share-signing-key", "utf8"),
  OIDC_ISSUER: "http://127.0.0.1:5010",
  OIDC_AUDIENCE: "automotive-xr",
  NEXT_PUBLIC_OIDC_ISSUER: "http://127.0.0.1:5010",
  NEXT_PUBLIC_OIDC_CLIENT_ID: "automotive-xr-local",
};
const children = [
  spawn("pnpm", ["--filter", "@xr/api", "dev:identity"], {
    env,
    stdio: "inherit",
    detached: true,
  }),
  spawn("pnpm", ["dev"], { env, stdio: "inherit", detached: true }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children)
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
    }
  setTimeout(() => process.exit(code), 500).unref();
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code ?? 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
