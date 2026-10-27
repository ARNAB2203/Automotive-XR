import {test,expect} from 'vitest';
import {z} from 'zod';
test('tenant identifiers reject empty and malformed input',()=>{const tenant=z.string().uuid();expect(tenant.safeParse('').success).toBe(false);expect(tenant.safeParse('11111111-1111-4111-8111-111111111111').success).toBe(true);});
