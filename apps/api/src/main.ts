import "./telemetry";
import { Inject } from "@nestjs/common";

import { loadEnvironment } from "@xr/config";
import "reflect-metadata";
import { Controller, Get, Module, Req } from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { Db } from "./db";
import { AuthGuard, AuthRequest, Public } from "./auth";
import { CatalogController } from "./catalog";
import { ConfigurationsController } from "./configurations";
import { ManagementController } from "./management";
import { AdminController } from "./admin";
import { ApiErrors } from "./errors";
import {
  StreamingController,
  Sessions,
  HttpSessionAllocator,
} from "./streaming";
@Controller()
class SystemController {
  constructor(@Inject(Db) private db: Db) {}
  @Public() @Get("health") health() {
    return { status: "ok", service: "automotive-xr-api" };
  }
  @Public() @Get("ready") async ready() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: "ready" };
  }
  @Get("me") me(@Req() req: AuthRequest) {
    return req.identity;
  }
}
@Module({
  controllers: [
    SystemController,
    CatalogController,
    ConfigurationsController,
    AdminController,
    ManagementController,
    StreamingController,
  ],
  providers: [
    Db,
    Sessions,
    HttpSessionAllocator,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
export async function bootstrap() {
  const config = loadEnvironment(process.env);
  const app = await NestFactory.create(AppModule);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    const requestId = randomUUID();
    res.setHeader("X-Request-ID", requestId);
    res.on("finish", () =>
      console.log(
        JSON.stringify({
          level: "info",
          event: "request.completed",
          requestId,
          method: req.method,
          route: req.route?.path ?? "unmatched",
          status: res.statusCode,
          durationMs: Math.round(performance.now() - start),
        }),
      ),
    );
    next();
  });
  app.use(helmet());
  app.use(rateLimit({ windowMs: 60000, limit: 120 }));
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001"
    ).split(","),
  });
  app.useGlobalFilters(new ApiErrors());
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("3KNOT Automotive XR")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("docs", app, document);
  await app.listen(config.API_PORT, "0.0.0.0");
  return app;
}
if (require.main === module)
  bootstrap().catch((e) => {
    console.error(e);
    process.exit(1);
  });
