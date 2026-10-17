import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { err, ok } from "@/lib/api/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const entitlements = await db.entitlement.findMany({
    where: { projectId },
    include: { planEntitlements: { include: { plan: { include: { product: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    entitlements: entitlements.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      description: e.description,
      valueType: e.valueType,
      plans: e.planEntitlements.map((pe) => ({
        planCode: pe.plan.code,
        planName: pe.plan.name,
        productName: pe.plan.product.name,
        value: safeJson(pe.value, true),
      })),
    })),
  });
}

function safeJson(s: string, fallback: unknown): unknown {
  try { return JSON.parse(s); } catch { return fallback; }
}
