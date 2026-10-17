import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const url = new URL(req.url);
  const envId = url.searchParams.get("envId");
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status"); // active | blocked | pending
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(url.searchParams.get("pageSize") ?? "50"), 100);

  const where: Record<string, unknown> = { projectId };
  if (envId) where.environmentId = envId;
  if (status) where.status = status;
  if (search) where.email = { contains: search };

  const [users, total] = await Promise.all([
    db.projectUser.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        environment: { select: { id: true, name: true, slug: true } },
        _count: { select: { sessions: true, subscriptions: true, purchases: true } },
      },
    }),
    db.projectUser.count({ where }),
  ]);

  return ok({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      displayName: u.displayName,
      status: u.status,
      emailVerifiedAt: u.emailVerifiedAt,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
      environment: u.environment,
      sessionsCount: u._count.sessions,
      subscriptionsCount: u._count.subscriptions,
      purchasesCount: u._count.purchases,
    })),
    total,
    page,
    pageSize,
  });
}

const updateSchema = z.object({
  status: z.enum(["active", "blocked", "pending", "deleted"]).optional(),
  displayName: z.string().min(1).max(80).nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const user = await requireUser();
  const { projectId, userId } = await params;
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
  const updated = await db.projectUser.update({
    where: { id: userId },
    data: {
      ...(parsed.status ? { status: parsed.status } : {}),
      ...(parsed.displayName !== undefined ? { displayName: parsed.displayName } : {}),
    },
  });
  // If blocking, revoke all sessions
  if (parsed.status === "blocked" || parsed.status === "deleted") {
    await db.projectSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return ok({ user: { id: updated.id, status: updated.status } });
}
