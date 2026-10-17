import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      environments: {
        include: {
          _count: { select: { credentials: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { auditLogs: true } },
    },
  });

  return ok({ project });
}

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(280).nullable(),
  status: z.enum(["active", "suspended", "archived"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;

  let parsed;
  try {
    parsed = updateSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  const updated = await db.project.update({
    where: { id: projectId },
    data: {
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.status ? { status: parsed.status } : {}),
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "project.update",
    resourceType: "project",
    resourceId: project_id_safe(updated.id),
    organizationId: ctx.organization.id,
    projectId: updated.id,
    request: req,
    metadata: { changes: parsed },
  });

  return ok({ project: updated });
}

function project_id_safe(id: string) {
  return id;
}
