import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveDataPlaneContext, resolveProjectUser } from "@/lib/auth/project/data-plane";
import { resolveEntitlements } from "@/lib/billing";
import { err, ok } from "@/lib/api/response";

export async function GET(_req: NextRequest) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);
  const { user } = await resolveProjectUser(ctx);
  if (!user) return err("UNAUTHORIZED", "نشست نامعتبر.", 401);

  const subs = await db.subscription.findMany({
    where: { projectUserId: user.id },
    include: { plan: { include: { product: true } }, events: { take: 10, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  const entitlements = await resolveEntitlements(user.id);

  return ok({
    subscriptions: subs.map((s) => ({
      id: s.id,
      status: s.status,
      provider: s.provider,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      plan: s.plan ? { code: s.plan.code, name: s.plan.name, product: s.plan.product.name } : null,
      recentEvents: s.events.map((e) => ({ eventType: e.eventType, source: e.source, occurredAt: e.occurredAt })),
    })),
    entitlements,
  });
}
