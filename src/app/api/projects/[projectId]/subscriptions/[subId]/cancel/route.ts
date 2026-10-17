import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; subId: string }> }
) {
  const user = await requireUser();
  const { projectId, subId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "operate");
  if (denied) return denied;
  const sub = await db.subscription.findUnique({ where: { id: subId } });
  if (!sub || sub.projectId !== projectId) return err("NOT_FOUND", "اشتراک یافت نشد.", 404);

  await db.subscription.update({
    where: { id: subId },
    data: { cancelAtPeriodEnd: true },
  });
  await db.subscriptionEvent.create({
    data: {
      subscriptionId: subId,
      eventType: "subscription.cancel_requested",
      source: "dashboard",
      processedAt: new Date(),
      payloadRedacted: JSON.stringify({ actor: user.email }),
    },
  });
  await recordAudit({
    actorId: user.id,
    action: "subscription.cancel_requested",
    resourceType: "subscription",
    resourceId: subId,
    organizationId: ctx.organization.id,
    projectId,
    request: req,
    metadata: null,
  });
  return ok({ ok: true });
}
