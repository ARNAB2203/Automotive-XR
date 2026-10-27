import { Inject } from "@nestjs/common";
import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  Req,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { z } from "zod";
import { Db } from "./db";
import { AuthRequest, Roles } from "./auth";
const definitions = {
  options: {
    model: "vehicleOption",
    schema: z
      .object({
        code: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(80),
        name: z.string().min(1).max(100),
        category: z.enum(["paint", "wheels", "interior", "trim"]),
        swatch: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      })
      .strict(),
  },
  variants: {
    model: "vehicleVariant",
    schema: z.object({ name: z.string().min(1).max(100) }).strict(),
  },
  rules: {
    model: "optionCompatibilityRule",
    schema: z
      .object({
        optionCode: z.string().min(1).max(80),
        excludesCode: z.string().min(1).max(80),
        message: z.string().min(1).max(200),
      })
      .strict(),
  },
  dealers: {
    model: "dealer",
    schema: z
      .object({
        name: z.string().min(2).max(100),
        city: z.string().min(2).max(100),
      })
      .strict(),
  },
  "price-books": {
    model: "priceBook",
    schema: z
      .object({ currency: z.enum(["USD", "EUR", "INR"]), active: z.boolean() })
      .strict(),
  },
  tenants: {
    model: "tenant",
    schema: z
      .object({
        slug: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(80),
        name: z.string().min(2).max(100),
      })
      .strict(),
  },
} as const;
@ApiTags("Administration")
@ApiBearerAuth()
@Roles(Role.TENANT_ADMIN, Role.PLATFORM_ADMIN)
@Controller("admin")
export class ManagementController {
  constructor(@Inject(Db) private db: Db) {}
  @Post("price-books") async book(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    const data = definitions["price-books"].schema.parse(body);
    return this.db.$transaction(
      async (tx) => {
        if (data.active)
          await tx.priceBook.updateMany({
            where: { tenantId: req.identity.tenantId },
            data: { active: false },
          });
        const item = await tx.priceBook.create({
          data: { ...data, tenantId: req.identity.tenantId },
        });
        await tx.auditEvent.create({
          data: {
            tenantId: req.identity.tenantId,
            subject: req.identity.subject,
            action: "price-book.created",
            entityId: item.id,
          },
        });
        return item;
      },
      { isolationLevel: "Serializable" },
    );
  }
  private definition(collection: string, req: AuthRequest) {
    if (!(collection in definitions))
      throw new NotFoundException("Collection not found");
    if (
      collection === "tenants" &&
      !req.identity.roles.includes(Role.PLATFORM_ADMIN)
    )
      throw new ForbiddenException("Platform role required");
    return definitions[collection as keyof typeof definitions];
  }
  @Put(":collection/:id") async update(
    @Req() req: AuthRequest,
    @Param("collection") collection: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const definition = this.definition(collection, req);
    z.string().uuid().parse(id);
    const data = definition.schema.parse(body);
    return this.db.$transaction(
      async (tx) => {
        const delegate = (tx as any)[definition.model];
        const where = {
          id,
          ...(collection === "tenants"
            ? {}
            : { tenantId: req.identity.tenantId }),
        };
        const existing = await delegate.findFirst({ where });
        if (!existing) throw new NotFoundException("Record not found");
        if (collection === "rules") {
          const input = data as z.infer<typeof definitions.rules.schema>;
          if (
            input.optionCode === input.excludesCode ||
            (await tx.vehicleOption.count({
              where: {
                tenantId: req.identity.tenantId,
                vehicleId: existing.vehicleId,
                code: { in: [input.optionCode, input.excludesCode] },
              },
            })) !== 2
          )
            throw new BadRequestException(
              "Choose two distinct vehicle options",
            );
        }
        if (
          collection === "options" &&
          existing.code !== (data as unknown as { code: string }).code
        )
          throw new BadRequestException(
            "Option codes are immutable; create a new option instead",
          );
        if (
          collection === "price-books" &&
          (data as { active: boolean }).active
        )
          await tx.priceBook.updateMany({
            where: { tenantId: req.identity.tenantId, id: { not: id } },
            data: { active: false },
          });
        const item = await delegate.update({ where, data });
        await tx.auditEvent.create({
          data: {
            tenantId: req.identity.tenantId,
            subject: req.identity.subject,
            action: collection + ".updated",
            entityId: id,
          },
        });
        return item;
      },
      { isolationLevel: "Serializable" },
    );
  }
  @Delete(":collection/:id") async remove(
    @Req() req: AuthRequest,
    @Param("collection") collection: string,
    @Param("id") id: string,
  ) {
    const definition = this.definition(collection, req);
    z.string().uuid().parse(id);
    return this.db.$transaction(
      async (tx) => {
        const delegate = (tx as any)[definition.model];
        const where = {
          id,
          ...(collection === "tenants"
            ? {}
            : { tenantId: req.identity.tenantId }),
        };
        const existing = await delegate.findFirst({ where });
        if (!existing) throw new NotFoundException("Record not found");
        if (collection === "price-books") {
          if (existing.active)
            throw new BadRequestException("Activate another price book first");
          await tx.priceBookEntry.deleteMany({
            where: { tenantId: req.identity.tenantId, priceBookId: id },
          });
        }
        if (
          collection === "options" &&
          (await tx.optionCompatibilityRule.count({
            where: {
              tenantId: req.identity.tenantId,
              vehicleId: existing.vehicleId,
              OR: [
                { optionCode: existing.code },
                { excludesCode: existing.code },
              ],
            },
          }))
        )
          throw new BadRequestException(
            "Remove compatibility rules referencing this option first",
          );
        await delegate.delete({ where });
        await tx.auditEvent.create({
          data: {
            tenantId: req.identity.tenantId,
            subject: req.identity.subject,
            action: collection + ".deleted",
            entityId: id,
          },
        });
        return { status: "deleted" };
      },
      { isolationLevel: "Serializable" },
    );
  }
}
