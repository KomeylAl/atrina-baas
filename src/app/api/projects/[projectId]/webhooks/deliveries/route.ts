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
  const endpointId = url.searchParams.get("endpointId");
  const where: Record<string, unknown> = {};
  if (endpointId) {
    where.endpointId = endpointId;
    where.endpoint = { projectId };
  } else {
    where.endpoint = { projectId };
  }

  const deliveries = await db.webhookDelivery.findMany({
    where,
    include: { endpoint: { select: { id: true, url: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({
    deliveries: deliveries.map((d) => ({
      id: d.id,
      endpoint: d.endpoint,
      eventType: d.eventType,
      status: d.status,
      attempts: d.attempts,
      responseCode: d.responseCode,
      errorMessage: d.errorMessage,
      payload: JSON.parse(d.payload),
      createdAt: d.createdAt,
      deliveredAt: d.deliveredAt,
    })),
  });
}
