import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveDataPlaneContext } from "@/lib/auth/project/data-plane";
import { err, ok } from "@/lib/api/response";

// GET /api/v1/billing/products — list products with their plans
export async function GET(_req: NextRequest) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);

  const products = await db.product.findMany({
    where: { projectId: ctx.project.id, status: "active" },
    include: {
      plans: {
        where: { status: "active" },
        include: { planEntitlements: { include: { entitlement: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok({
    products: products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      plans: p.plans.map((pl) => ({
        id: pl.id,
        code: pl.code,
        name: pl.name,
        billingPeriodUnit: pl.billingPeriodUnit,
        billingPeriodCount: pl.billingPeriodCount,
        price: pl.price,
        currency: pl.currency,
        features: pl.features ? JSON.parse(pl.features) : null,
        entitlements: pl.planEntitlements.map((pe) => ({
          code: pe.entitlement.code,
          name: pe.entitlement.name,
          value: safeJson(pe.value, true),
        })),
      })),
    })),
  });
}

function safeJson(s: string, fallback: unknown): unknown {
  try { return JSON.parse(s); } catch { return fallback; }
}
