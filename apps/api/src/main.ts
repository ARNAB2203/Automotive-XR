import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
@Controller()
class HealthController {
  @Get('health') health() { return { status: 'ok', service: 'automotive-xr-api' }; }
}
@Module({ controllers: [HealthController] })
class AppModule {}
async function main() {
 const app = await NestFactory.create(AppModule);
 app.use(helmet());
 app.use(rateLimit({windowMs: 60000, limit: 120}));
 app.enableCors({origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001').split(',')});
 const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('3KNOT Automotive XR').setVersion('1.0.0').build());
 SwaggerModule.setup('docs', app, document);
 await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0');
}
main().catch(e => { console.error(e); process.exit(1); });
