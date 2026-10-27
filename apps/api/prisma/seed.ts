import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const tenantId='11111111-1111-4111-8111-111111111111';
async function seed(){
 await db.$transaction(async tx => {
 await tx.tenant.upsert({where:{id:tenantId},update:{},create:{id:tenantId,slug:'3knot',name:'3KNOT Motors'}});
 const vehicle=await tx.vehicleModel.upsert({where:{tenantId_slug:{tenantId,slug:'aether-gt'}},update:{},create:{tenantId,slug:'aether-gt',name:'Aether GT',description:'A grand touring concept. Demonstrator with a schematic placeholder vehicle.'}});
 await tx.vehicleVariant.upsert({where:{id:'22222222-2222-4222-8222-222222222222'},update:{},create:{id:'22222222-2222-4222-8222-222222222222',tenantId,vehicleId:vehicle.id,name:'Grand Touring'}});
 const options=[['paint-graphite','Graphite','paint','#414946',0],['paint-copper','Burnished copper','paint','#b46f46',180000],['paint-ivory','Porcelain','paint','#e2ddd0',120000],['wheel-aero','Aero 20”','wheels',null,0],['wheel-sport','Forged 22”','wheels',null,240000],['interior-charcoal','Charcoal textile','interior',null,0],['interior-tan','Saddle leather','interior',null,160000],['trim-touring','Touring','trim',null,0],['trim-sport','Sport','trim',null,300000]] as const;
 const priceBook=await tx.priceBook.upsert({where:{id:'33333333-3333-4333-8333-333333333333'},update:{},create:{id:'33333333-3333-4333-8333-333333333333',tenantId,currency:'USD'}});
 for(const [code,name,category,swatch,amount] of options){
 await tx.vehicleOption.upsert({where:{tenantId_vehicleId_code:{tenantId,vehicleId:vehicle.id,code}},update:{},create:{tenantId,vehicleId:vehicle.id,code,name,category,swatch}});
 await tx.priceBookEntry.upsert({where:{tenantId_priceBookId_code:{tenantId,priceBookId:priceBook.id,code}},update:{},create:{tenantId,priceBookId:priceBook.id,code,amount}});
 }
 await tx.priceBookEntry.upsert({where:{tenantId_priceBookId_code:{tenantId,priceBookId:priceBook.id,code:vehicle.id}},update:{},create:{tenantId,priceBookId:priceBook.id,code:vehicle.id,amount:7890000}});
 await tx.optionCompatibilityRule.upsert({where:{id:'44444444-4444-4444-8444-444444444444'},update:{},create:{id:'44444444-4444-4444-8444-444444444444',tenantId,vehicleId:vehicle.id,optionCode:'trim-sport',excludesCode:'wheel-aero',message:'Sport trim requires forged wheels.'}});
 await tx.dealer.upsert({where:{id:'55555555-5555-4555-8555-555555555555'},update:{},create:{id:'55555555-5555-4555-8555-555555555555',tenantId,name:'3KNOT Studio',city:'Bengaluru'}});
 });
 console.log('Development catalog seeded (idempotent).');
}
seed().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
