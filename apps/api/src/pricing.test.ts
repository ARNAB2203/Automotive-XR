import { describe,it,expect } from 'vitest';
import { calculatePrice } from './pricing';
import { signShare,verifyShare } from './configurations';
const options=[{code:'black',category:'paint'},{code:'aero',category:'wheels'},{code:'sport',category:'wheels'},{code:'cloth',category:'interior'},{code:'touring',category:'trim'}];
const selected=['black','aero','cloth','touring'];
const prices=[{code:'vehicle',amount:5000000},...options.map(o=>({code:o.code,amount:o.code==='sport'?200000:0}))];
describe('authoritative pricing',()=>{
 it('adds base price and selected extras in minor units',()=>expect(calculatePrice(options,[],prices,'vehicle',['black','sport','cloth','touring']).total).toBe(5200000));
 it('rejects unknown options',()=>expect(()=>calculatePrice(options,[],prices,'vehicle',[...selected.slice(0,3),'other'])).toThrow('Unknown option'));
 it('rejects duplicate options',()=>expect(()=>calculatePrice(options,[],prices,'vehicle',[...selected,'black'])).toThrow('Duplicate'));
 it('requires every category',()=>expect(()=>calculatePrice(options,[],prices,'vehicle',selected.slice(1))).toThrow('paint'));
 it('rejects exclusions',()=>expect(()=>calculatePrice(options,[{optionCode:'black',excludesCode:'aero',message:'Incompatible'}],prices,'vehicle',selected)).toThrow('Incompatible'));
 it('fails closed on missing price',()=>expect(()=>calculatePrice(options,[],prices.slice(1),'vehicle',selected)).toThrow('unavailable'));
});
it('share signatures reject tampering and wrong keys',()=>{const value=signShare('id','secret');expect(verifyShare(value,'secret')).toBe(true);expect(verifyShare(value+'x','secret')).toBe(false);expect(verifyShare(value,'other')).toBe(false);});
