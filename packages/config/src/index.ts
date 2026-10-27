import { z } from "zod";
const optional = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);
const schema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => /^postgres(ql)?:/.test(value)),
  API_PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
  GPU_CAPACITY: z.coerce.number().int().min(1).max(100).default(1),
  OIDC_ISSUER: optional,
  OIDC_AUDIENCE: optional,
  SHARE_SIGNING_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001")
    .refine((value) =>
      value.split(",").every((origin) => {
        try {
          const url = new URL(origin);
          return (
            ["http:", "https:"].includes(url.protocol) && url.origin === origin
          );
        } catch {
          return false;
        }
      }),
    ),
});
export function loadEnvironment(raw: Record<string, string | undefined>) {
  const result = schema.safeParse(raw);
  if (!result.success)
    throw new Error(
      "Invalid environment fields: " +
        [
          ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
        ].join(", "),
    );
  return result.data;
}
