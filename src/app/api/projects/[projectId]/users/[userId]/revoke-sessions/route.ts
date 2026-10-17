import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const user = await requireUser();
  const { projectId, userId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;
  const target = await db.projectUser.findUnique({ where: { id: userId } });
  if (!target || target.projectId !== projectId) {
    return err("NOT_FOUND", "کاربر یافت نشد.", 404);
  }
  const result = await db.projectSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await recordAudit({
    actorId: user.id,
    action: "project_user.sessions_revoked",
    resourceType: "project_user",
    resourceId: userId,
    organizationId: ctx.organization.id,
    projectId,
    request: req,
    metadata: { count: result.count },
  });
  return ok({ revoked: result.count });
}
