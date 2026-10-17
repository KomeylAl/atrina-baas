import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { err, ok } from "@/lib/api/response";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; endpointId: string }> }
) {
  const user = await requireUser();
  const { projectId, endpointId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;
  const ep = await db.webhookEndpoint.findUnique({ where: { id: endpointId } });
  if (!ep || ep.projectId !== projectId) return err("NOT_FOUND", "endopoint یافت نشد.", 404);
  await db.webhookEndpoint.delete({ where: { id: endpointId } });
  return ok({ ok: true });
}
