import { Body, Controller, Get, Param, Post, Req, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { selectionSchema } from '@xr/types';
import { Db } from './db';
import { AuthRequest, Public } from './auth';
import { price } from './catalog';
function signingKey(){const key=process.env.SHARE_SIGNING_KEY;if(!key||key.length<32)throw new ServiceUnavailableException('Share signing key not configured');return key;}
export function signShare(id:string,key:string){return id+'.'+createHmac('sha256',key).update(id).digest('base64url');}
export function verifyShare(value:string,key:string){const [id]=value.split('.');const expected=Buffer.from(signShare(id,key));const supplied=Buffer.from(value);return expected.length===supplied.length&&timingSafeEqual(expected,supplied);}
@ApiTags('Configurations')
@ApiBearerAuth()
@Controller('configurations')
export class ConfigurationsController {
 constructor(private db:Db){}
 @Get() list(@Req() req:AuthRequest){return this.db.vehicleConfiguration.findMany({where:{tenantId:req.identity.tenantId,userId:req.identity.userId},include:{vehicle:true},orderBy:{createdAt:'desc'}});}
 @Post() async save(@Req() req:AuthRequest,@Body() body:unknown){
 const input=selectionSchema.parse(body);const shareId=signShare(randomUUID(),signingKey());
 return this.db.$transaction(async tx=>{
 // Serializable transaction ensures the price snapshot and selection validation are consistent.
 const result=await price(tx as Db,req.identity.tenantId,input);
 const record=await tx.vehicleConfiguration.create({data:{tenantId:req.identity.tenantId,userId:req.identity.userId,vehicleId:input.vehicleId,options:input.options,total:result.total,currency:result.currency,shareId}});
 await tx.auditEvent.create({data:{tenantId:req.identity.tenantId,subject:req.identity.subject,action:'configuration.created',entityId:record.id}});
 return record;
 },{isolationLevel:'Serializable'});
 }
 @Public() @Get('shared/:shareId') async shared(@Param('shareId') shareId:string){
 if(!verifyShare(shareId,signingKey()))throw new NotFoundException('Configuration not found');
 const c=await this.db.vehicleConfiguration.findUnique({where:{shareId},select:{vehicle:{select:{name:true,slug:true}},options:true,total:true,currency:true,createdAt:true}});
 if(!c)throw new NotFoundException('Configuration not found');return c;
 }
}
