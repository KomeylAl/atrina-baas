import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { err, ok } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const subs = await db.subscription.findMany({
    where: {
      ...(status ? { status } : {}),
      projectId,
    },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      plan: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Resolve envs separately since Subscription has no relation to Environment
  const envIds = [...new Set(subs.map((s) => s.environmentId))];
  const envs = await db.environment.findMany({
    where: { id: { in: envIds } },
    select: { id: true, name: true, slug: true },
  });
  const envMap = new Map(envs.map((e) => [e.id, e]));

  return ok({
    subscriptions: subs.map((s) => ({
      id: s.id,
      status: s.status,
      provider: s.provider,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      user: s.user,
      plan: s.plan ? { code: s.plan.code, name: s.plan.name, product: s.plan.product.name } : null,
      environment: envMap.get(s.environmentId) ?? null,
      createdAt: s.createdAt,
    })),
  });
}
