import { spawnSync } from "node:child_process";
// Schema parsing needs a syntactically valid URL even though generation never connects.
const result = spawnSync(
  "pnpm",
  ["--filter", "@xr/api", "exec", "prisma", "generate"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://localhost/automotive",
    },
  },
);
process.exit(result.status ?? 1);
