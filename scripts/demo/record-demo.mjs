/** Record real setup output and browser workflows. Requires Docker, Chromium, ffmpeg. */
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const output = resolve(root, "docs/demo");
const scratch = resolve(root, ".local/demo-recording");
const dbName = "xr_video_" + randomBytes(5).toString("hex");
const xdgData = process.env.XDG_DATA_HOME ?? resolve(homedir(), ".local/share");
const env = {
  ...process.env,
  XDG_DATA_HOME: xdgData,
  XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? resolve(homedir(), ".cache"),
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME ?? resolve(homedir(), ".config"),
  PATH: resolve(xdgData, "pnpm/bin") + ":" + process.env.PATH,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "local_dev_only",
  DATABASE_URL: `postgresql://automotive:${encodeURIComponent(process.env.POSTGRES_PASSWORD ?? "local_dev_only")}@localhost:5432/${dbName}`,
  NEXT_PUBLIC_OIDC_ISSUER: "http://127.0.0.1:5010",
  NEXT_PUBLIC_OIDC_CLIENT_ID: "automotive-xr-local",
  NEXT_TELEMETRY_DISABLED: "1",
  TURBO_TELEMETRY_DISABLED: "1",
  FORCE_COLOR: "0",
};
const secrets = Object.entries(env)
  .filter(
    ([key, value]) =>
      value && /PASSWORD|TOKEN|SIGNING_KEY|DATABASE_URL/.test(key),
  )
  .map(([, value]) => value);
function clean(value) {
  let text = String(value)
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .replace(/\r/g, "");
  for (const secret of secrets) text = text.split(secret).join("[redacted]");
  return text.replace(/([?&](?:code|state|token)=)[^\s&]+/g, "$1[redacted]");
}
const history = [];
const listeners = new Set();
function log(value) {
  const entry = clean(value);
  history.push(entry);
  for (const response of listeners)
    response.write("data: " + JSON.stringify(entry) + "\n\n");
}
const terminal = String.raw`<!doctype html><html lang="en"><meta charset="utf-8"><title>3KNOT — End-to-end demo</title><style>
*{box-sizing:border-box}body{margin:0;background:#14231c;color:#e8eddf;font-family:Arial,sans-serif;padding:56px 66px}small{color:#d9f36d;letter-spacing:3px;font-size:11px}h1{font-size:46px;letter-spacing:-2px;font-weight:500;margin:18px 0 14px}p{color:#b7c5b4;font-size:16px;line-height:1.7;max-width:1000px}.terminal{background:#0c1611;border:1px solid #3f5343;border-radius:12px;padding:22px 28px;height:440px;overflow:hidden;margin-top:30px}pre{font-family:monospace;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word;margin:0}.dots{color:#d9f36d;letter-spacing:7px;margin-bottom:14px;font-size:14px}footer{font-size:12px;color:#8ca18c;margin-top:20px}strong{color:#d9f36d}
</style><small>3KNOT / AUTOMOTIVE XR</small><h1 id="title">From setup to a working demo.</h1><p id="description">Real commands. Real browser flows. A dedicated demo database.<br>Next.js · NestJS · PostgreSQL · Redis · OIDC</p><div class="terminal" id="terminal"><div class="dots">● ● ● <span style="letter-spacing:1px;font-size:11px;color:#8ca18c"> LIVE COMMAND OUTPUT</span></div><pre id="output">Preparing the recording…
</pre></div><footer>Web demonstrator · schematic vehicle preview · Unreal / GPU rendering is not shown.</footer><script>
const output=document.getElementById('output');output.textContent='';const stream=new EventSource('/events');stream.onmessage=event=>{output.textContent+=JSON.parse(event.data);const box=document.getElementById('terminal');box.scrollTop=box.scrollHeight;};
</script></html>`;
const server = createServer((request, response) => {
  if (request.url === "/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    for (const entry of history)
      response.write("data: " + JSON.stringify(entry) + "\n\n");
    listeners.add(response);
    request.on("close", () => listeners.delete(response));
  } else {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(terminal);
  }
});
const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
let apps;
let dbCreated = false;
let browser;
let context;
let page;
let currentCaption = "SETUP → EXECUTION  |  A real, captioned web demo";
let started;
const chapters = [];
async function chapter(title, caption, dwell = 1800) {
  currentCaption = caption;
  chapters.push({ title, seconds: Math.round((Date.now() - started) / 1000) });
  console.log("Chapter: " + title);
  await page.evaluate((text) => {
    const banner = document.getElementById("demo-caption");
    if (banner) banner.textContent = text;
  }, caption);
  await pause(dwell);
}
async function run(command, args) {
  log("\n$ " + command + " " + args.join(" ") + "\n");
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", log);
    child.stderr.on("data", log);
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(command + " failed with exit " + code)),
    );
  });
  log("✓ Command completed successfully\n");
  await pause(1000);
}
async function ready(url, timeout = 90000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* startup */
    }
    await pause(500);
  }
  throw new Error("Service did not become ready: " + new URL(url).pathname);
}
async function visit(url, title, caption) {
  currentCaption = caption;
  await page.goto(url, { waitUntil: "networkidle" });
  await chapter(title, caption);
}
function stopApps() {
  if (apps?.pid && apps.exitCode === null) {
    try {
      process.kill(-apps.pid, "SIGTERM");
    } catch {
      /* already stopped */
    }
  }
}
async function main() {
  for (const port of [3000, 3001, 4000, 5010]) {
    try {
      await fetch("http://127.0.0.1:" + port, {
        signal: AbortSignal.timeout(1000),
      });
      throw new Error(
        "Port " +
          port +
          " is already occupied; stop your own development processes before recording.",
      );
    } catch (error) {
      if (error.message.includes("already occupied")) throw error;
    }
  }
  await mkdir(output, { recursive: true });
  await mkdir(scratch, { recursive: true });
  await new Promise((resolvePromise) =>
    server.listen(5098, "127.0.0.1", resolvePromise),
  );
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ??
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
  });
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: resolve(scratch, "raw"),
      size: { width: 1280, height: 800 },
    },
  });
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent =
        "#demo-caption{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#14231cf2;color:#d9f36d;padding:16px 26px;font:500 14px Arial;letter-spacing:.3px;border-top:1px solid #6e8358;pointer-events:none}body{padding-bottom:58px!important}nextjs-portal{display:none!important}";
      document.head.append(style);
      const banner = document.createElement("div");
      banner.id = "demo-caption";
      banner.textContent = "3KNOT Automotive XR · Web demo";
      document.body.append(banner);
    });
  });
  page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on("domcontentloaded", () =>
    page
      .evaluate((text) => {
        const banner = document.getElementById("demo-caption");
        if (banner) banner.textContent = text;
      }, currentCaption)
      .catch(() => {}),
  );
  started = Date.now();
  await page.goto("http://127.0.0.1:5098");
  log(
    "Prepared Git checkout · warm dependency cache · isolated demo data\nNo production credentials or real customer records are used.\n",
  );
  await chapter("Introduction", currentCaption, 4000);
  await run("git", ["branch", "--show-current"]);
  await run("node", ["--version"]);
  await run("pnpm", ["--version"]);
  await chapter(
    "Install dependencies",
    "01 / SETUP  ·  Install the pinned workspace dependencies",
  );
  await run("pnpm", ["install", "--frozen-lockfile"]);
  await chapter(
    "Start local services",
    "02 / SERVICES  ·  Start PostgreSQL and Redis; wait for healthy services",
  );
  await run("docker", ["compose", "up", "-d", "--wait"]);
  await run("docker", [
    "compose",
    "exec",
    "-T",
    "postgres",
    "createdb",
    "-U",
    "automotive",
    dbName,
  ]);
  dbCreated = true;
  await chapter(
    "Generate, migrate and seed",
    "03 / DATABASE  ·  Generate Prisma, apply migrations, seed a new demo database",
  );
  await run("pnpm", ["db:generate"]);
  await run("pnpm", ["db:migrate"]);
  await run("pnpm", ["db:seed"]);
  await chapter(
    "Test and build",
    "04 / VALIDATE  ·  Run real unit tests, production builds and integration checks",
  );
  await run("pnpm", ["test", "--force"]);
  await run("pnpm", ["build"]);
  await run("pnpm", ["test:integration"]);
  await chapter(
    "Launch applications",
    "05 / START  ·  Launch the web, admin, API and local OIDC fixture",
  );
  log("\n$ pnpm dev:local\n");
  apps = spawn("pnpm", ["dev:local"], {
    cwd: root,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let showStartup = true;
  apps.stdout.on("data", (data) => {
    if (showStartup) log(data);
  });
  apps.stderr.on("data", (data) => {
    if (showStartup) log(data);
  });
  await Promise.all([
    ready("http://localhost:4000/ready"),
    ready("http://localhost:3000"),
    ready("http://localhost:3001"),
    ready("http://127.0.0.1:5010/.well-known/openid-configuration"),
  ]);
  showStartup = false;
  log(
    "\n✓ API database readiness, customer app, admin app and OIDC discovery passed.\n",
  );
  await pause(2200);
  await visit(
    "http://localhost:3000",
    "Customer landing page",
    "06 / CUSTOMER  ·  Explore the working customer experience",
  );
  await page.screenshot({ path: resolve(output, "demo-poster.png") });
  await pause(2200);
  await page
    .getByRole("link", { name: "Explore the collection", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Aether GT", exact: true }),
  ).toBeVisible();
  await chapter(
    "Vehicle catalog",
    "CATALOG  ·  Vehicle data is loaded from PostgreSQL through the API",
    2800,
  );
  await page.getByRole("link", { name: "Discover more", exact: false }).click();
  await page.waitForURL(/\/vehicles\/aether-gt/);
  await chapter(
    "Vehicle details",
    "DETAILS  ·  View the vehicle and start a personal configuration",
    2800,
  );
  await page
    .getByRole("link", { name: "Create your configuration", exact: false })
    .click();
  await page.waitForURL(/\/configure\//);
  await expect(page.getByText("$78,900", { exact: true })).toBeVisible();
  await chapter(
    "Configurator and authoritative pricing",
    "07 / CONFIGURE  ·  Schematic preview; prices and compatibility come from the backend",
    3500,
  );
  await page
    .getByRole("button", { name: "Burnished copper", exact: true })
    .click();
  await expect(page.getByText("$80,700", { exact: true })).toBeVisible();
  await chapter(
    "Paint selection",
    "PAINT  ·  Choose Burnished copper; the server returns the updated price",
    2800,
  );
  await page.getByRole("button", { name: "Sport", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Sport trim requires forged wheels",
  );
  await expect(
    page.getByRole("button", { name: "Save & share configuration" }),
  ).toBeDisabled();
  await chapter(
    "Invalid option combination",
    "COMPATIBILITY  ·  Sport trim requires forged wheels; invalid builds cannot be saved",
    3500,
  );
  await page.getByRole("button", { name: "Forged 22”", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save & share configuration" }),
  ).toBeEnabled();
  await chapter(
    "Valid configuration",
    "VALID BUILD  ·  Select forged wheels to satisfy the backend compatibility rule",
    2800,
  );
  await page
    .getByRole("button", { name: "Saddle leather", exact: true })
    .click();
  await pause(2000);
  await page.getByRole("button", { name: "night", exact: true }).click();
  await pause(1800);
  await page.getByRole("button", { name: "interior", exact: true }).click();
  await chapter(
    "Schematic interior and environment",
    "PREVIEW CONTROLS  ·  Interior and environment previews remain clearly schematic",
    2800,
  );
  await page.getByRole("button", { name: "exterior", exact: true }).click();
  await page.getByRole("button", { name: "studio", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: false }).click();
  await page
    .getByRole("heading", { name: "Development identity fixture" })
    .waitFor();
  await chapter(
    "Customer sign-in",
    "08 / SIGN IN  ·  Local-only OIDC + PKCE fixture; never deploy this identity service publicly",
    3000,
  );
  await page.getByRole("link", { name: "Continue as customer" }).click();
  await page.waitForURL(/\/configure\//);
  await expect(
    page.getByRole("button", { name: "Save & share configuration" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Save & share configuration" })
    .click();
  await expect(
    page.getByRole("link", { name: "Open shared configuration" }),
  ).toBeVisible();
  await chapter(
    "Save configuration",
    "09 / SAVE  ·  Persist a validated configuration and generate a signed share link",
    2800,
  );
  await page.getByRole("link", { name: "Open shared configuration" }).click();
  await page.waitForURL(/\/configuration\//);
  await expect(
    page.getByText("Saved price snapshot.", { exact: false }),
  ).toBeVisible();
  await chapter(
    "Signed shared configuration",
    "SHARE  ·  A server-rendered public summary without customer identity",
    3500,
  );
  await page.getByRole("link", { name: "Your garage", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "View configuration", exact: false }),
  ).toBeVisible();
  await chapter(
    "Saved garage",
    "GARAGE  ·  Retrieve the signed-in customer’s saved configuration",
    2800,
  );
  await visit(
    "http://localhost:3000/contact",
    "Dealer enquiry",
    "10 / ENQUIRE  ·  Submit a quotation enquiry with explicit contact consent",
  );
  await page.getByLabel("Your name").fill("Alex Morgan");
  await pause(700);
  await page.getByLabel("Email address").fill("demo@example.test");
  await page
    .getByLabel("Your studio")
    .selectOption({ label: "3KNOT Studio · Bengaluru" });
  await page.getByRole("checkbox").check();
  await pause(1800);
  await page.getByRole("button", { name: "Send your enquiry" }).click();
  await expect(page.getByRole("status")).toContainText("received");
  await chapter(
    "Enquiry received",
    "LEAD CAPTURE  ·  The consented enquiry is stored for the selected tenant and dealer",
    3000,
  );
  await visit(
    "http://localhost:3001",
    "Admin sign-in",
    "11 / ADMIN  ·  Enter the protected studio administration workspace",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Continue as tenant admin" }).click();
  await page.waitForURL("http://localhost:3001/");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await chapter(
    "Admin overview",
    "OVERVIEW  ·  Read live tenant counts with database-backed authorization",
    2800,
  );
  await page.getByRole("button", { name: "Leads", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "demo@example.test", exact: true }),
  ).toBeVisible();
  await chapter(
    "Submitted lead in administration",
    "END-TO-END  ·  The customer’s enquiry is now visible to the tenant administrator",
    3500,
  );
  await page.getByRole("button", { name: "Vehicles", exact: true }).click();
  await page.getByLabel("URL slug").fill("demo-studio-concept");
  await page.getByLabel("Vehicle name").fill("Studio Concept");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A catalog entry created during this recorded demo.");
  await page
    .getByRole("button", { name: "Save changes" })
    .scrollIntoViewIfNeeded();
  await chapter(
    "Catalog administration",
    "12 / MANAGE  ·  Create a real catalog entry through the protected API",
    2000,
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  const vehicleRow = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: "Studio Concept", exact: true }),
  });
  await expect(vehicleRow).toBeVisible();
  await pause(2000);
  await vehicleRow
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Vehicle archived");
  await chapter(
    "Archive catalog entry",
    "ARCHIVE  ·  Retire the demo catalog entry without deleting business history",
    2200,
  );
  await page.getByRole("button", { name: "Pricing", exact: true }).click();
  await chapter(
    "Price management",
    "PRICING  ·  Manage authoritative price-book entries in integer minor units",
    2500,
  );
  await page.getByRole("button", { name: "Audit log", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "vehicle.archived", exact: true }),
  ).toBeVisible();
  await chapter(
    "Audit trail",
    "AUDIT  ·  Inspect the recorded configuration, enquiry and catalog actions",
    2800,
  );
  await visit(
    "http://localhost:4000/docs",
    "OpenAPI documentation",
    "13 / API  ·  Inspect the actual NestJS Swagger / OpenAPI documentation",
  );
  await pause(2000);
  await visit(
    "http://127.0.0.1:5098",
    "Demo complete",
    "DEMO COMPLETE  ·  Working web workflows verified; Unreal / GPU execution remains pending",
  );
  await page.evaluate(() => {
    document.getElementById("title").textContent =
      "From setup to execution. Verified.";
    document.getElementById("description").innerHTML =
      "Installed → migrated → seeded → tested → built → launched.<br>Configured → signed in → saved → shared → enquired → administered.";
    document.getElementById("terminal").style.height = "350px";
    document.getElementById("output").textContent =
      "✓ 11 unit tests\n✓ 25 API integration checks\n✓ Redis / WebSocket gateway integration\n✓ Customer configuration, OIDC sign-in, save / share / garage\n✓ Dealer enquiry visible in administration\n✓ Catalog creation / archival, pricing and audit views\n\nScope: schematic web demonstrator.\nNot shown: licensed Unreal scene, real GPU / WebRTC, AWS deployment.\n\nRepository: github.com/ARNAB2203/Automotive-XR";
  });
  await pause(6000);
  const video = page.video();
  await page.close();
  await context.close();
  context = undefined;
  const rawVideo = await video.path();
  await writeFile(
    resolve(scratch, "chapters.json"),
    JSON.stringify(chapters, null, 2) + "\n",
  );
  await browser.close();
  browser = undefined;
  const target = resolve(output, "automotive-xr-demo.mp4");
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      rawVideo,
      "-an",
      "-vf",
      "fps=24",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "25",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      target,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error("Video encode failed: " + result.stderr.slice(-1000));
  if ((await stat(target)).size > 24 * 1024 * 1024)
    throw new Error(
      "Video exceeds the repository media budget; adjust encoding before publishing.",
    );
  const clips = [
    "Customer landing page",
    "Paint selection",
    "Submitted lead in administration",
  ].map((title) => chapters.find((c) => c.title === title).seconds + 1);
  const trims = clips
    .map(
      (start, i) =>
        `[0:v]trim=start=${start}:duration=3,setpts=PTS-STARTPTS,fps=7,scale=640:-1[v${i}]`,
    )
    .join(";");
  const filter =
    trims +
    ";[v0][v1][v2]concat=n=3:v=1:a=0,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer";
  const gif = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      target,
      "-filter_complex",
      filter,
      "-loop",
      "0",
      resolve(output, "demo-preview.gif"),
    ],
    { encoding: "utf8" },
  );
  if (gif.status !== 0)
    throw new Error("Preview encode failed: " + gif.stderr.slice(-1000));
  const duration = Number(
    spawnSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        target,
      ],
      { encoding: "utf8" },
    ).stdout.trim(),
  );
  const metadata = {
    durationSeconds: Math.round(duration),
    width: 1280,
    height: 800,
    audio: false,
    setup:
      "Executed against a new isolated demo database; dependency cache was already warm.",
    chapters,
  };
  await writeFile(
    resolve(output, "chapters.json"),
    JSON.stringify(metadata, null, 2) + "\n",
  );
  console.log("Recording complete: docs/demo/automotive-xr-demo.mp4");
}
try {
  await main();
} catch (error) {
  console.error(clean(error.message));
  process.exitCode = 1;
} finally {
  stopApps();
  await pause(2000);
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  for (const listener of listeners) listener.end();
  server.close();
  if (dbCreated) {
    const dropped = spawnSync(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "postgres",
        "dropdb",
        "-U",
        "automotive",
        "--force",
        dbName,
      ],
      { cwd: root, env, encoding: "utf8" },
    );
    if (dropped.status !== 0)
      console.error(
        "The isolated recording database could not be removed; inspect it manually: " +
          dbName,
      );
  }
}
