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
  const where: Record<string, unknown> = {};
  if (envId) where.environmentId = envId;
  else where.environment = { projectId };

  const templates = await db.notificationTemplate.findMany({
    where,
    include: { environment: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok({
    templates: templates.map((t) => ({
      id: t.id,
      channel: t.channel,
      code: t.code,
      name: t.name,
      subject: t.subject,
      body: t.body,
      status: t.status,
      environment: t.environment,
      createdAt: t.createdAt,
    })),
  });
}

const createSchema = z.object({
  environmentId: z.string().min(1),
  channel: z.enum(["sms", "email", "push"]),
  code: z.string().min(2).max(60).regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/),
  name: z.string().min(2).max(120),
  subject: z.string().max(200).nullable(),
  body: z.string().min(1).max(5000),
});

export async function POST(
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
    parsed = createSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }
  const env = await db.environment.findUnique({ where: { id: parsed.environmentId } });
  if (!env || env.projectId !== projectId) return err("NOT_FOUND", "محیط یافت نشد.", 404);

  const template = await db.notificationTemplate.create({
    data: {
      projectId,
      environmentId: env.id,
      channel: parsed.channel,
      code: parsed.code,
      name: parsed.name,
      subject: parsed.subject ?? null,
      body: parsed.body,
      status: "active",
    },
  });
  return ok({ template });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; templateId: string }> }
) {
  // Reuse the [templateId] route handler via this endpoint if needed.
  return ok({ ok: true });
}
