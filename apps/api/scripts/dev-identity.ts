/** Loopback-only development OIDC fixture. Never deploy this identity provider. */
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Development identity fixture cannot run in production");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { slug: "3knot" },
  });
  for (const [subject, role] of [
    ["dev-customer", Role.CUSTOMER],
    ["dev-admin", Role.TENANT_ADMIN],
  ] as const) {
    const user = await db.user.upsert({
      where: { tenantId_subject: { tenantId: tenant.id, subject } },
      update: {},
      create: {
        tenantId: tenant.id,
        subject,
        email: subject + "@example.test",
      },
    });
    await db.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: {},
      create: { userId: user.id, role },
    });
  }
  await db.$disconnect();
  const issuer = "http://127.0.0.1:5010";
  const clientId = "automotive-xr-local";
  const redirects = new Set([
    "http://localhost:3000/auth/callback",
    "http://localhost:3001/auth/callback",
  ]);
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: "local-ephemeral",
    alg: "RS256",
    use: "sig",
  };
  type Code = {
    redirect: string;
    challenge: string;
    nonce: string;
    subject: string;
    expires: number;
  };
  const codes = new Map<string, Code>();
  const server = createServer(async (req, res) => {
    try {
      const origin = req.headers.origin;
      if (
        origin &&
        ["http://localhost:3000", "http://localhost:3001"].includes(origin)
      ) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      }
      res.setHeader("Cache-Control", "no-store");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      const url = new URL(req.url ?? "/", issuer);
      const q = url.searchParams;
      function json(value: unknown, status = 200) {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(value));
      }
      if (url.pathname === "/.well-known/openid-configuration") {
        json({
          issuer,
          jwks_uri: issuer + "/jwks",
          authorization_endpoint: issuer + "/authorize",
          token_endpoint: issuer + "/token",
          response_types_supported: ["code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none"],
          scopes_supported: ["openid", "profile", "email"],
        });
        return;
      }
      if (url.pathname === "/jwks") {
        json({ keys: [jwk] });
        return;
      }
      if (url.pathname === "/authorize") {
        const redirect = q.get("redirect_uri") ?? "",
          challenge = q.get("code_challenge") ?? "",
          state = q.get("state") ?? "",
          nonce = q.get("nonce") ?? "";
        if (
          !redirects.has(redirect) ||
          q.get("client_id") !== clientId ||
          q.get("response_type") !== "code" ||
          q.get("code_challenge_method") !== "S256" ||
          !challenge.match(/^[A-Za-z0-9_-]{43}$/) ||
          !state
        ) {
          json({ error: "invalid_request" }, 400);
          return;
        }
        const role = q.get("local_role");
        if (!role) {
          res.writeHead(200, { "Content-Type": "text/html" });
          const c = new URL(url);
          c.searchParams.set("local_role", "customer");
          const a = new URL(url);
          a.searchParams.set("local_role", "admin");
          res.end(
            '<!doctype html><html lang="en"><title>Local development sign-in</title><body style="font-family:Arial;padding:50px"><h1>Development identity fixture</h1><p>Loopback only. No passwords. Never deploy this service.</p><a href="' +
              c.pathname +
              c.search.replace(/&/g, "&amp;") +
              '">Continue as customer</a><br/><br/><a href="' +
              a.pathname +
              a.search.replace(/&/g, "&amp;") +
              '">Continue as tenant admin</a></body></html>',
          );
          return;
        }
        if (!["admin", "customer"].includes(role)) {
          json({ error: "invalid_request" }, 400);
          return;
        }
        const code = randomUUID();
        codes.set(code, {
          redirect,
          challenge,
          nonce,
          subject: "dev-" + role,
          expires: Date.now() + 60000,
        });
        const callback = new URL(redirect);
        callback.searchParams.set("code", code);
        callback.searchParams.set("state", state);
        res.writeHead(302, { Location: callback.toString() });
        res.end();
        return;
      }
      if (url.pathname === "/token" && req.method === "POST") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 8192) throw new Error("Too large");
        }
        const f = new URLSearchParams(body),
          code = f.get("code") ?? "",
          record = codes.get(code);
        codes.delete(code);
        if (
          !record ||
          record.expires < Date.now() ||
          f.get("client_id") !== clientId ||
          f.get("redirect_uri") !== record.redirect ||
          f.get("grant_type") !== "authorization_code" ||
          createHash("sha256")
            .update(f.get("code_verifier") ?? "")
            .digest("base64url") !== record.challenge
        ) {
          json({ error: "invalid_grant" }, 400);
          return;
        }
        const claims = { tenant_id: tenant.id };
        const sign = (extra: Record<string, unknown>, audience: string) =>
          new SignJWT({ ...claims, ...extra })
            .setProtectedHeader({ alg: "RS256", kid: "local-ephemeral" })
            .setSubject(record.subject)
            .setIssuer(issuer)
            .setAudience(audience)
            .setIssuedAt()
            .setExpirationTime("15m")
            .sign(privateKey);
        json({
          access_token: await sign({}, "automotive-xr"),
          id_token: await sign(
            { nonce: record.nonce, email: record.subject + "@example.test" },
            clientId,
          ),
          token_type: "Bearer",
          expires_in: 900,
          scope: "openid profile email",
        });
        return;
      }
      json({ error: "not_found" }, 404);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_request" }));
    }
  });
  const timer = setInterval(() => {
    for (const [code, value] of codes)
      if (value.expires < Date.now()) codes.delete(code);
  }, 60000);
  timer.unref();
  server.listen(5010, "127.0.0.1", () =>
    console.log("Development identity fixture ready on loopback port 5010."),
  );
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
