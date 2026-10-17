import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { replayDelivery } from "@/lib/webhooks/deliver";
import { err, ok } from "@/lib/api/response";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; deliveryId: string }> }
) {
  const user = await requireUser();
  const { projectId, deliveryId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;
  const delivery = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });
  if (!delivery || delivery.endpoint.projectId !== projectId) {
    return err("NOT_FOUND", "تحویل یافت نشد.", 404);
  }
  try {
    const result = await replayDelivery(deliveryId);
    return ok({ result });
  } catch (e) {
    return err("REPLAY_FAILED", (e as Error).message, 500);
  }
}
