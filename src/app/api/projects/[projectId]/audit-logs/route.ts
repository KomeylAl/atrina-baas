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

  const logs = await db.auditLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { id: true, email: true, displayName: true } },
    },
  });

  return ok({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      actorType: l.actorType,
      actor: l.actor
        ? { id: l.actor.id, email: l.actor.email, displayName: l.actor.displayName }
        : null,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      metadata: l.metadata,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
  });
}
