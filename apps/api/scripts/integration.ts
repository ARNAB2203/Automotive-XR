import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const issuer='http://127.0.0.1:5099'; const base='http://127.0.0.1:4010';
async function main(){
 const {publicKey,privateKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'integration',alg:'RS256'};
 const oidc=createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url?.includes('openid-configuration')?{issuer,jwks_uri:issuer+'/jwks'}:{keys:[jwk]}));});
 await new Promise<void>(resolve=>oidc.listen(5099,'127.0.0.1',resolve));
 const server=spawn(process.execPath,['dist/main.js'],{env:{...process.env,API_PORT:'4010',OIDC_ISSUER:issuer,OIDC_AUDIENCE:'xr-integration',SHARE_SIGNING_KEY:randomUUID()+randomUUID()},stdio:['ignore','pipe','pipe']});
 let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
 const tenantIds:string[]=[];let count=0;
 function check(condition:unknown,message:string){assert.ok(condition,message);count++;console.log('PASS '+message);}
 async function request(path:string,method='GET',body?:unknown,token?:string){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};}
 try {
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/ready')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,'API startup failed: '+logs);
 const tenant=await db.tenant.create({data:{slug:'integration-'+randomUUID(),name:'Integration'}});tenantIds.push(tenant.id);
 const other=await db.tenant.create({data:{slug:'other-'+randomUUID(),name:'Other'}});tenantIds.push(other.id);
 const vehicle=await db.vehicleModel.create({data:{tenantId:tenant.id,slug:'test-car',name:'Test car',description:'Integration fixture'}});
 const otherVehicle=await db.vehicleModel.create({data:{tenantId:other.id,slug:'other',name:'Other car',description:'Isolation fixture'}});
 const selected=['black','aero','cloth','touring'];
 for(const [i,category] of ['paint','wheels','interior','trim'].entries())await db.vehicleOption.create({data:{tenantId:tenant.id,vehicleId:vehicle.id,category,code:selected[i],name:selected[i]}});
 const book=await db.priceBook.create({data:{tenantId:tenant.id,currency:'USD'}});
 for(const code of [vehicle.id,...selected])await db.priceBookEntry.create({data:{tenantId:tenant.id,priceBookId:book.id,code,amount:code===vehicle.id?5000000:10000}});
 const dealer=await db.dealer.create({data:{tenantId:tenant.id,name:'Test dealer',city:'Test'}});
 const otherDealer=await db.dealer.create({data:{tenantId:other.id,name:'Other dealer',city:'Other'}});
 for(const [subject,role] of [['admin',Role.TENANT_ADMIN],['customer',Role.CUSTOMER]] as const)await db.user.create({data:{tenantId:tenant.id,subject,email:subject+'@example.test',roles:{create:{role}}}});
 async function token(subject:string,audience='xr-integration'){return new SignJWT({tenant_id:tenant.id}).setProtectedHeader({alg:'RS256',kid:'integration'}).setSubject(subject).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(privateKey);}
 const admin=await token('admin'),customer=await token('customer');
 const prefix='/public/'+tenant.slug;
 let response=await request(prefix+'/vehicles');check(response.status===200&&response.data.length===1&&response.data[0].id===vehicle.id,'public catalog stays in selected tenant');
 response=await request(prefix+'/pricing','POST',{vehicleId:vehicle.id,options:selected});check(response.status===201&&response.data.total===5040000,'API calculates authoritative price from database');
 response=await request(prefix+'/pricing','POST',{vehicleId:otherVehicle.id,options:selected});check(response.status===404,'cross-tenant pricing denied');
 response=await request(prefix+'/pricing','POST',{vehicleId:vehicle.id,options:selected,total:1});check(response.status===400,'client price injection rejected');
 response=await request('/admin/vehicles');check(response.status===401,'admin requires authentication');
 response=await request('/admin/vehicles','GET',undefined,customer);check(response.status===403,'customer cannot access administration');
 response=await request('/me','GET',undefined,await token('admin','wrong'));check(response.status===401,'wrong token audience rejected');
 response=await request('/admin/vehicles','GET',undefined,admin);check(response.status===200&&response.data.length===1,'administrator sees own tenant catalog');
 response=await request('/admin/vehicles/'+otherVehicle.id,'PUT',{slug:'hacked',name:'Hacked',description:''},admin);check(response.status===404,'cross-tenant catalog writes denied');
 response=await request('/configurations','POST',{vehicleId:vehicle.id,options:selected},customer);check(response.status===201&&response.data.total===5040000,'authenticated configuration saved');
 const shareId=response.data.shareId;
 response=await request('/configurations/shared/'+shareId);check(response.status===200&&!('userId' in response.data)&&!('tenantId' in response.data),'signed public share omits customer identity');
 response=await request('/configurations/shared/'+shareId+'x');check(response.status===404,'tampered share rejected');
 response=await request('/configurations','GET',undefined,customer);check(response.status===200&&response.data.length===1,'customer retrieves own saved configuration');
 response=await request(prefix+'/leads','POST',{dealerId:otherDealer.id,type:'QUOTATION',name:'Test User',email:'test@example.test',consent:true});check(response.status===404,'cross-tenant dealer assignment rejected');
 response=await request(prefix+'/leads','POST',{dealerId:dealer.id,type:'QUOTATION',name:'Test User',email:'test@example.test',consent:false});check(response.status===400,'lead requires explicit consent');
 response=await request(prefix+'/leads','POST',{dealerId:dealer.id,type:'QUOTATION',name:'Test User',email:'test@example.test',consent:true});check(response.status===201&&response.data.status==='received','consented lead stored');
 response=await request('/admin/leads','GET',undefined,admin);check(response.status===200&&response.data.length===1,'admin retrieves submitted lead');
 response=await request('/admin/audit','GET',undefined,admin);check(response.status===200&&response.data.some((a:any)=>a.action==='configuration.created'),'commercial writes recorded in audit log');
 console.log(`${count} API integration checks passed.`);
 }finally{
 server.kill('SIGTERM');oidc.close();
 if(tenantIds.length){
 const where={tenantId:{in:tenantIds}};
 await db.auditEvent.deleteMany({where});await db.customerLead.deleteMany({where});await db.streamingSession.deleteMany({where});await db.vehicleConfiguration.deleteMany({where});
 await db.userRole.deleteMany({where:{user:{tenantId:{in:tenantIds}}}});await db.user.deleteMany({where});await db.dealer.deleteMany({where});await db.priceBookEntry.deleteMany({where});await db.priceBook.deleteMany({where});await db.optionCompatibilityRule.deleteMany({where});await db.vehicleOption.deleteMany({where});await db.vehicleVariant.deleteMany({where});await db.vehicleModel.deleteMany({where});await db.tenant.deleteMany({where:{id:{in:tenantIds}}});
 }
 await db.$disconnect();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
