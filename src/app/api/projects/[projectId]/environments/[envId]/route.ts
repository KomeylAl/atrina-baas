import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  status: z.enum(["active", "suspended", "archived"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ envId: string; projectId: string }> }
) {
  const user = await requireUser();
  const { envId, projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;

  const env = await db.environment.findUnique({
    where: { id: envId },
  });
  if (!env || env.projectId !== projectId) {
    return err("NOT_FOUND", "محیط یافت نشد.", 404);
  }

  let parsed;
  try {
    parsed = updateSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  const updated = await db.environment.update({
    where: { id: envId },
    data: {
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.status ? { status: parsed.status } : {}),
    },
  });

  return ok({ environment: updated });
}
