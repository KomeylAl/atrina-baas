import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

const createSchema = z.object({
  productId: z.string().min(1),
  code: z.string().min(2).max(60).regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/),
  name: z.string().min(2).max(120),
  billingPeriodUnit: z.enum(["day", "week", "month", "year"]),
  billingPeriodCount: z.number().int().min(1).max(100),
  price: z.number().int().min(0),
  currency: z.string().min(2).max(8).default("IRR"),
  features: z.record(z.unknown()).optional(),
  entitlements: z.array(z.object({ code: z.string(), value: z.unknown() })).default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;
  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }
  // Verify product belongs to project
  const product = await db.product.findUnique({ where: { id: parsed.productId } });
  if (!product || product.projectId !== projectId) return err("NOT_FOUND", "محصول یافت نشد.", 404);

  const existing = await db.plan.findUnique({
    where: { productId_code: { productId: product.id, code: parsed.code } },
  });
  if (existing) return err("CODE_IN_USE", "کد طرح تکراری است.", 409);

  // Create plan + entitlements
  const plan = await db.plan.create({
    data: {
      productId: product.id,
      code: parsed.code,
      name: parsed.name,
      billingPeriodUnit: parsed.billingPeriodUnit,
      billingPeriodCount: parsed.billingPeriodCount,
      price: parsed.price,
      currency: parsed.currency,
      features: parsed.features ? JSON.stringify(parsed.features) : null,
      status: "active",
    },
  });

  // Attach entitlements
  for (const e of parsed.entitlements) {
    let ent = await db.entitlement.findUnique({
      where: { projectId_code: { projectId, code: e.code } },
    });
    if (!ent) {
      ent = await db.entitlement.create({
        data: { projectId, code: e.code, name: e.code, valueType: "boolean" },
      });
    }
    await db.planEntitlement.create({
      data: {
        planId: plan.id,
        entitlementId: ent.id,
        value: JSON.stringify(e.value ?? true),
      },
    }).catch(() => undefined); // ignore duplicates
  }

  return ok({ plan });
}
