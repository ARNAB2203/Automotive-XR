import { Inject } from "@nestjs/common";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
} from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { selectionSchema, leadSchema } from "@xr/types";
import { Db } from "./db";
import { Public } from "./auth";
import { calculatePrice, defaultSelection } from "./pricing";
export async function tenant(db: Db, slug: string) {
  const t = await db.tenant.findUnique({ where: { slug } });
  if (!t) throw new NotFoundException("Tenant not found");
  return t;
}
export async function price(
  db: Db,
  tenantId: string,
  input: z.infer<typeof selectionSchema>,
) {
  const vehicle = await db.vehicleModel.findFirst({
    where: { id: input.vehicleId, tenantId, active: true },
    include: { options: true, rules: true },
  });
  if (!vehicle) throw new NotFoundException("Vehicle not found");
  const books = await db.priceBook.findMany({
    where: { tenantId, active: true },
    include: { entries: true },
  });
  if (books.length !== 1)
    throw new NotFoundException("A single active price book is required");
  return {
    ...calculatePrice(
      vehicle.options,
      vehicle.rules,
      books[0].entries,
      vehicle.id,
      input.options,
    ),
    currency: books[0].currency,
  };
}
@ApiTags("Public catalog")
@Public()
@Controller("public/:tenant")
export class CatalogController {
  constructor(@Inject(Db) private db: Db) {}
  @Get("vehicles") async vehicles(@Param("tenant") slug: string) {
    const t = await tenant(this.db, slug);
    return this.db.vehicleModel.findMany({
      where: { tenantId: t.id, active: true },
      include: { options: true, variants: true },
    });
  }
  @Get("vehicles/:slug") async vehicle(
    @Param("tenant") tenantSlug: string,
    @Param("slug") slug: string,
  ) {
    const t = await tenant(this.db, tenantSlug);
    const vehicle = await this.db.vehicleModel.findFirst({
      where: { tenantId: t.id, slug, active: true },
      include: { options: true, variants: true },
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    return vehicle;
  }
  @Get("defaults/:vehicleId") async defaults(
    @Param("tenant") slug: string,
    @Param("vehicleId") vehicleId: string,
  ) {
    const t = await tenant(this.db, slug);
    z.string().uuid().parse(vehicleId);
    const vehicle = await this.db.vehicleModel.findFirst({
      where: { id: vehicleId, tenantId: t.id, active: true },
      include: { options: true, rules: true },
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    const books = await this.db.priceBook.findMany({
      where: { tenantId: t.id, active: true },
      include: { entries: true },
    });
    if (books.length !== 1)
      throw new NotFoundException("Price book unavailable");
    return defaultSelection(
      vehicle.options,
      vehicle.rules,
      books[0].entries,
      vehicle.id,
    );
  }
  @Post("pricing")
  @ApiBody({
    schema: {
      type: "object",
      required: ["vehicleId", "options"],
      properties: {
        vehicleId: { type: "string", format: "uuid" },
        options: { type: "array", items: { type: "string" } },
      },
    },
  })
  async pricing(@Param("tenant") slug: string, @Body() body: unknown) {
    const t = await tenant(this.db, slug);
    return price(this.db, t.id, selectionSchema.parse(body));
  }
  @Post("validate") async validate(
    @Param("tenant") slug: string,
    @Body() body: unknown,
  ) {
    return this.pricing(slug, body);
  }
  @Get("dealers") async dealers(@Param("tenant") slug: string) {
    const t = await tenant(this.db, slug);
    return this.db.dealer.findMany({ where: { tenantId: t.id } });
  }
  @Post("leads") async lead(
    @Param("tenant") slug: string,
    @Body() body: unknown,
  ) {
    const t = await tenant(this.db, slug);
    const input = leadSchema.parse(body);
    if (
      !(await this.db.dealer.findFirst({
        where: { id: input.dealerId, tenantId: t.id },
      }))
    )
      throw new NotFoundException("Dealer not found");
    if (input.preferredDate && new Date(input.preferredDate) <= new Date())
      throw new (await import("@nestjs/common")).BadRequestException(
        "Choose a future date",
      );
    return this.db.$transaction(async (tx) => {
      const lead = await tx.customerLead.create({
        data: {
          ...input,
          tenantId: t.id,
          preferredDate: input.preferredDate
            ? new Date(input.preferredDate)
            : undefined,
        },
      });
      await tx.auditEvent.create({
        data: {
          tenantId: t.id,
          subject: "public",
          action: "lead.created",
          entityId: lead.id,
        },
      });
      return { id: lead.id, status: "received" };
    });
  }
}
