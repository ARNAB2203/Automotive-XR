import { BadRequestException } from '@nestjs/common';
export function calculatePrice(options:{code:string;category:string}[],rules:{optionCode:string;excludesCode:string;message:string}[],entries:{code:string;amount:number}[],vehicleId:string,selected:string[]){
 if(new Set(selected).size!==selected.length)throw new BadRequestException('Duplicate options');
 const chosen=selected.map(code=>{const option=options.find(o=>o.code===code);if(!option)throw new BadRequestException('Unknown option');return option;});
 for(const category of ['paint','wheels','interior','trim'])if(chosen.filter(o=>o.category===category).length!==1)throw new BadRequestException(`Choose exactly one ${category} option`);
 if(chosen.length!==4)throw new BadRequestException('Unsupported option category');
 for(const rule of rules)if(selected.includes(rule.optionCode)&&selected.includes(rule.excludesCode))throw new BadRequestException(rule.message);
 const breakdown=[vehicleId,...selected].map(code=>{const entry=entries.find(e=>e.code===code);if(!entry||entry.amount<0||!Number.isSafeInteger(entry.amount))throw new BadRequestException('Price unavailable');return {code,amount:entry.amount}});
 const total=breakdown.reduce((s,e)=>s+e.amount,0);
 if(!Number.isSafeInteger(total))throw new BadRequestException('Price exceeds supported range');
 return {valid:true as const,total,breakdown};
}
