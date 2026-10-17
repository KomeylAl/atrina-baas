import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { err, ok } from "@/lib/api/response";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; templateId: string }> }
) {
  const user = await requireUser();
  const { projectId, templateId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;
  const tpl = await db.notificationTemplate.findUnique({ where: { id: templateId } });
  if (!tpl || tpl.projectId !== projectId) return err("NOT_FOUND", "قالب یافت نشد.", 404);
  await db.notificationTemplate.delete({ where: { id: templateId } });
  return ok({ ok: true });
}
