import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const products = await db.product.findMany({
    where: { projectId },
    include: {
      plans: {
        include: {
          planEntitlements: { include: { entitlement: true } },
          _count: { select: { subscriptions: true, purchases: true } },
        },
        orderBy: { price: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    products: products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      status: p.status,
      plans: p.plans.map((pl) => ({
        id: pl.id,
        code: pl.code,
        name: pl.name,
        billingPeriodUnit: pl.billingPeriodUnit,
        billingPeriodCount: pl.billingPeriodCount,
        price: pl.price,
        currency: pl.currency,
        status: pl.status,
        subscriptionsCount: pl._count.subscriptions,
        purchasesCount: pl._count.purchases,
        entitlements: pl.planEntitlements.map((pe) => ({
          code: pe.entitlement.code,
          name: pe.entitlement.name,
          value: safeJson(pe.value, true),
        })),
      })),
    })),
  });
}

const createSchema = z.object({
  code: z.string().min(2).max(60).regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/, "کد نامعتبر"),
  name: z.string().min(2).max(120),
  description: z.string().max(280).nullable(),
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
  const existing = await db.product.findUnique({
    where: { projectId_code: { projectId, code: parsed.code } },
  });
  if (existing) return err("CODE_IN_USE", "کد تکراری است.", 409);

  const product = await db.product.create({
    data: {
      projectId,
      code: parsed.code,
      name: parsed.name,
      description: parsed.description ?? null,
      status: "active",
    },
  });
  return ok({ product });
}

function safeJson(s: string, fallback: unknown): unknown {
  try { return JSON.parse(s); } catch { return fallback; }
}
