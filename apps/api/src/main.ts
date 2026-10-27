import 'reflect-metadata';
import { Controller, Get, Module, Req } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { Db } from './db';
import { AuthGuard, AuthRequest, Public } from './auth';
import { CatalogController } from './catalog';
import { ConfigurationsController } from './configurations';
import { AdminController } from './admin';
import { ApiErrors } from './errors';
@Controller()
class SystemController {
 constructor(private db:Db){}
 @Public() @Get('health') health(){return {status:'ok',service:'automotive-xr-api'};}
 @Public() @Get('ready') async ready(){await this.db.$queryRaw`SELECT 1`;return {status:'ready'};}
 @Get('me') me(@Req() req:AuthRequest){return req.identity;}
}
@Module({controllers:[SystemController,CatalogController,ConfigurationsController,AdminController],providers:[Db,{provide:APP_GUARD,useClass:AuthGuard}]})
export class AppModule {}
export async function bootstrap(){
 const app=await NestFactory.create(AppModule);
 app.use(helmet());app.use(rateLimit({windowMs:60000,limit:120}));
 app.enableCors({origin:(process.env.CORS_ORIGINS??'http://localhost:3000,http://localhost:3001').split(',')});
 app.useGlobalFilters(new ApiErrors());app.enableShutdownHooks();
 const document=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('3KNOT Automotive XR').setVersion('1.0.0').addBearerAuth().build());
 SwaggerModule.setup('docs',app,document);
 await app.listen(Number(process.env.API_PORT??4000),'0.0.0.0');return app;
}
if(require.main===module)bootstrap().catch(e=>{console.error(e);process.exit(1)});
