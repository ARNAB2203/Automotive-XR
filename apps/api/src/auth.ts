import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { Db } from './db';
export type Identity={subject:string;tenantId:string;userId:string;roles:Role[]};
export type AuthRequest=Request & {identity:Identity};
export const Public=()=>SetMetadata('public',true);
export const Roles=(...roles:Role[])=>SetMetadata('roles',roles);
@Injectable()
export class AuthGuard implements CanActivate {
 private keys?: ReturnType<typeof createRemoteJWKSet>;
 constructor(private db:Db,private reflector:Reflector){}
 async canActivate(ctx:ExecutionContext){
 if(this.reflector.getAllAndOverride('public',[ctx.getHandler(),ctx.getClass()]))return true;
 const req=ctx.switchToHttp().getRequest<AuthRequest>();
 const issuer=process.env.OIDC_ISSUER; const audience=process.env.OIDC_AUDIENCE;
 if(!issuer||!audience)throw new UnauthorizedException('OIDC is not configured');
 const authorization=req.headers.authorization;
 if(!authorization?.startsWith('Bearer '))throw new UnauthorizedException('Bearer token required');
 try {
  if(!this.keys){
   const url=new URL(issuer);
   if(url.protocol!=='https:' && !(process.env.NODE_ENV!=='production'&&url.hostname==='127.0.0.1'))throw new Error('HTTPS issuer required');
   const response=await fetch(issuer.replace(/\/$/,'')+'/.well-known/openid-configuration',{signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw new Error('Discovery unavailable');
   const discovery=await response.json() as {issuer:string;jwks_uri:string};
   if(discovery.issuer!==issuer)throw new Error('Issuer mismatch');
   const jwksUrl=new URL(discovery.jwks_uri);
   if(jwksUrl.origin!==url.origin)throw new Error('Cross-origin JWKS not configured');
   this.keys=createRemoteJWKSet(jwksUrl);
  }
  const {payload}=await jwtVerify(authorization.slice(7),this.keys,{issuer,audience,algorithms:['RS256'],requiredClaims:['sub','exp','iat']});
  if(typeof payload.tenant_id!=='string'||!payload.sub)throw new Error('Missing identity');
  const user=await this.db.user.findUnique({where:{tenantId_subject:{tenantId:payload.tenant_id,subject:payload.sub}},include:{roles:true}});
  if(!user)throw new Error('Membership missing');
  req.identity={subject:payload.sub,tenantId:user.tenantId,userId:user.id,roles:user.roles.map(r=>r.role)};
 }catch {throw new UnauthorizedException('Invalid token or tenant membership');}
 const roles=this.reflector.getAllAndOverride<Role[]>('roles',[ctx.getHandler(),ctx.getClass()]);
 if(roles&&!roles.some(role=>req.identity.roles.includes(role)))throw new ForbiddenException('Role not permitted');
 return true;
 }
}
