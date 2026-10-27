import { Inject } from "@nestjs/common";
import {
  Body,
  Controller,
  Delete,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Param,
  Post,
  Req,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SignJWT } from "jose";
import { z } from "zod";
import { Db } from "./db";
import { AuthRequest } from "./auth";
@Injectable()
export class HttpSessionAllocator {
  configured() {
    return !!(
      process.env.ALLOCATOR_URL &&
      process.env.ALLOCATOR_SERVICE_TOKEN &&
      process.env.STREAM_SIGNING_KEY &&
      process.env.STREAM_SIGNING_KEY.length >= 32
    );
  }
  private async call(path: string, method: string, body?: unknown) {
    if (!this.configured())
      throw new ServiceUnavailableException("GPU allocator is not configured");
    const url = new URL(process.env.ALLOCATOR_URL!);
    if (
      url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw new ServiceUnavailableException("Allocator requires HTTPS");
    const r = await fetch(new URL(path, url), {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.ALLOCATOR_SERVICE_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok)
      throw new ServiceUnavailableException(
        "GPU allocation service unavailable",
      );
    return method === "DELETE" ? undefined : await r.json();
  }
  async allocate(sessionId: string) {
    const result = z
      .object({ signalingUrl: z.string().url() })
      .parse(await this.call("/sessions", "POST", { sessionId }));
    const url = new URL(result.signalingUrl);
    if (
      url.protocol !== "wss:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        url.protocol === "ws:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw new ServiceUnavailableException("Secure signaling required");
    return result;
  }
  async heartbeat(sessionId: string) {
    await this.call(
      "/sessions/" + encodeURIComponent(sessionId) + "/heartbeat",
      "POST",
      {},
    );
  }
  async release(sessionId: string) {
    await this.call("/sessions/" + encodeURIComponent(sessionId), "DELETE");
  }
}
@Injectable()
export class Sessions implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    @Inject(Db) private db: Db,
    @Inject(HttpSessionAllocator) private allocator: HttpSessionAllocator,
  ) {}
  onModuleInit() {
    this.timer = setInterval(
      () =>
        this.expire().catch(() =>
          console.error(JSON.stringify({ event: "stream.cleanup.failed" })),
        ),
      15000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  async expire() {
    const stale = await this.db.streamingSession.findMany({
      where: {
        OR: [
          {
            status: { in: ["STARTING", "ACTIVE"] },
            expiresAt: { lt: new Date() },
          },
          { status: "CLEANUP_PENDING" },
        ],
      },
      take: 100,
    });
    for (const s of stale) {
      const claimed = await this.db.streamingSession.updateMany({
        where: {
          id: s.id,
          OR: [
            {
              status: { in: ["STARTING", "ACTIVE"] },
              expiresAt: { lt: new Date() },
            },
            { status: "CLEANUP_PENDING" },
          ],
        },
        data: { status: "CLEANUP_PENDING" },
      });
      if (!claimed.count) continue;
      try {
        await this.allocator.release(s.id);
        await this.db.streamingSession.update({
          where: { id: s.id },
          data: { status: "EXPIRED" },
        });
      } catch {
        /* retain occupied capacity until remote cleanup succeeds */
      }
    }
  }
  async token(session: { id: string; tenantId: string; subject: string }) {
    return new SignJWT({ tenant_id: session.tenantId, session_id: session.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("automotive-xr-api")
      .setAudience("pixel-streaming-gateway")
      .setSubject(session.subject)
      .setIssuedAt()
      .setExpirationTime("2m")
      .sign(new TextEncoder().encode(process.env.STREAM_SIGNING_KEY));
  }
  async create(req: AuthRequest) {
    if (!this.allocator.configured())
      throw new ServiceUnavailableException(
        "Live Unreal streaming is unavailable; use the fallback preview",
      );
    const capacity = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(process.env.GPU_CAPACITY ?? "1");
    const session = await this.db.$transaction(async (tx) => {
      // A database advisory lock serializes allocation across API processes.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(3072027)`;
      const count = await tx.streamingSession.count({
        where: { status: { in: ["STARTING", "ACTIVE", "CLEANUP_PENDING"] } },
      });
      if (count >= capacity)
        throw new ServiceUnavailableException("All GPU sessions are busy");
      return tx.streamingSession.create({
        data: {
          tenantId: req.identity.tenantId,
          subject: req.identity.subject,
          status: "STARTING",
          expiresAt: new Date(Date.now() + 60000),
        },
      });
    });
    try {
      const allocation = await this.allocator.allocate(session.id);
      await this.db.streamingSession.update({
        where: { id: session.id },
        data: { status: "ACTIVE" },
      });
      return {
        id: session.id,
        ...allocation,
        token: await this.token(session),
        expiresAt: session.expiresAt,
      };
    } catch (e) {
      await this.db.streamingSession.update({
        where: { id: session.id },
        data: { status: "CLEANUP_PENDING" },
      });
      throw e;
    }
  }
  async owned(req: AuthRequest, id: string) {
    const s = await this.db.streamingSession.findFirst({
      where: {
        id: z.string().uuid().parse(id),
        tenantId: req.identity.tenantId,
        subject: req.identity.subject,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    });
    if (!s) throw new NotFoundException("Session not found or expired");
    return s;
  }
  async heartbeat(req: AuthRequest, id: string) {
    const session = await this.owned(req, id);
    await this.allocator.heartbeat(session.id);
    const result = await this.db.streamingSession.updateMany({
      where: {
        id: session.id,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      data: {
        lastHeartbeat: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    if (result.count !== 1) throw new NotFoundException("Session expired");
    return { status: "ACTIVE", token: await this.token(session) };
  }
  async end(req: AuthRequest, id: string) {
    const session = await this.owned(req, id);
    await this.db.streamingSession.update({
      where: { id: session.id },
      data: { status: "CLEANUP_PENDING" },
    });
    await this.expire();
    return { status: "ending" };
  }
}
@ApiTags("Streaming")
@ApiBearerAuth()
@Controller("streaming/sessions")
export class StreamingController {
  constructor(@Inject(Sessions) private sessions: Sessions) {}
  @Post() create(@Req() req: AuthRequest, @Body() body: unknown) {
    z.object({})
      .strict()
      .parse(body ?? {});
    return this.sessions.create(req);
  }
  @Post(":id/heartbeat") heartbeat(
    @Req() req: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.sessions.heartbeat(req, id);
  }
  @Delete(":id") end(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.sessions.end(req, id);
  }
}
