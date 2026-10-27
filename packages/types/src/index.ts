import { z } from "zod";
export const selectionSchema = z
  .object({
    vehicleId: z.string().uuid(),
    options: z.array(z.string().min(1).max(80)).min(1).max(20),
  })
  .strict();
export const leadSchema = z
  .object({
    dealerId: z.string().uuid(),
    type: z.enum(["QUOTATION", "TEST_DRIVE"]),
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254),
    consent: z.literal(true),
    preferredDate: z.string().datetime().optional(),
  })
  .strict();
export const vehicleSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    name: z.string().trim().min(2).max(100),
    description: z.string().max(2000),
    active: z.boolean().default(true),
  })
  .strict();
export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SET_PAINT"),
    payload: z.object({ code: z.string().max(80) }),
  }),
  z.object({
    type: z.literal("SET_WHEELS"),
    payload: z.object({ code: z.string().max(80) }),
  }),
  z.object({
    type: z.literal("SET_INTERIOR"),
    payload: z.object({ code: z.string().max(80) }),
  }),
  z.object({
    type: z.literal("SET_CAMERA"),
    payload: z.object({
      preset: z.enum(["exterior", "interior", "front", "rear"]),
    }),
  }),
  z.object({
    type: z.literal("SET_ENVIRONMENT"),
    payload: z.object({ preset: z.enum(["day", "night", "studio"]) }),
  }),
  z.object({ type: z.literal("RESET_CONFIGURATION"), payload: z.object({}) }),
]);
export const viewerMessageSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    command: commandSchema,
  })
  .strict();
export type ViewerMessage = z.infer<typeof viewerMessageSchema>;
export interface VehicleOption {
  id: string;
  code: string;
  name: string;
  category: string;
  swatch: string | null;
}
export interface Vehicle {
  id: string;
  slug: string;
  name: string;
  description: string;
  options: VehicleOption[];
  variants: { id: string; name: string }[];
}
export interface Price {
  valid: true;
  total: number;
  currency: string;
  breakdown: { code: string; amount: number }[];
}
export const money = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
