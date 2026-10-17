import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveDataPlaneContext, resolveProjectUser } from "@/lib/auth/project/data-plane";
import { err, ok } from "@/lib/api/response";

export async function GET(_req: NextRequest) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);
  const { user } = await resolveProjectUser(ctx);
  if (!user) return err("UNAUTHORIZED", "نشست نامعتبر.", 401);

  const purchases = await db.purchase.findMany({
    where: { projectUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { plan: { include: { product: true } } },
  });
  return ok({
    purchases: purchases.map((p) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      purchasedAt: p.purchasedAt,
      verifiedAt: p.verifiedAt,
      plan: p.plan ? { code: p.plan.code, name: p.plan.name, product: p.plan.product.name } : null,
    })),
  });
}
