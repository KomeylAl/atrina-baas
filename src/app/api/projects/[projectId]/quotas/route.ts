import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { QUOTA_METRICS, getCurrentUsage, type QuotaMetric } from "@/lib/quotas";
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
  if (!envId) return err("BAD_REQUEST", "envId لازم است.", 400);
  const env = await db.environment.findUnique({ where: { id: envId } });
  if (!env || env.projectId !== projectId) return err("NOT_FOUND", "محیط یافت نشد.", 404);

  // Get all quotas for this env, plus default metrics if not set
  const existingQuotas = await db.quota.findMany({
    where: { projectId, environmentId: envId },
  });

  const result: Array<{ metric: string; label: string; unit: string; limit: number; current: number; remaining: number; custom: boolean }> = [];
  for (const m of QUOTA_METRICS) {
    const q = existingQuotas.find((x) => x.metric === m.value);
    const limit = q?.limitValue ?? m.defaultLimit;
    const current = await getCurrentUsage(projectId, envId, m.value as QuotaMetric);
    result.push({
      metric: m.value,
      label: m.label,
      unit: m.unit,
      limit,
      current,
      remaining: Math.max(0, limit - current),
      custom: !!q,
    });
  }

  return ok({ quotas: result });
}

const updateSchema = z.object({
  environmentId: z.string().min(1),
  metric: z.enum(["api_requests", "storage_bytes", "monthly_users", "monthly_purchases"]),
  limitValue: z.number().int().min(0),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "admin");
  if (denied) return denied;
  let parsed;
  try {
    parsed = updateSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }
  const env = await db.environment.findUnique({ where: { id: parsed.environmentId } });
  if (!env || env.projectId !== projectId) return err("NOT_FOUND", "محیط یافت نشد.", 404);

  const quota = await db.quota.upsert({
    where: {
      projectId_environmentId_metric: {
        projectId,
        environmentId: parsed.environmentId,
        metric: parsed.metric,
      },
    },
    create: {
      projectId,
      environmentId: parsed.environmentId,
      metric: parsed.metric,
      limitValue: parsed.limitValue,
      period: "monthly",
    },
    update: { limitValue: parsed.limitValue },
  });
  return ok({ quota });
}
