import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveDataPlaneContext, resolveProjectUser } from "@/lib/auth/project/data-plane";
import { validateRecord, policyAllows, type SchemaDefinition } from "@/lib/data/schema";
import { parseRecordFilter, readRecordData, recordFilterWhere, toJsonValue } from "@/lib/data/record-filter";
import { enforceQuota } from "@/lib/quotas/middleware";
import { checkRateLimitOrError } from "@/lib/security/rate-limit";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

// GET /api/v1/data/{table} — list records
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);

  // Rate limit: 100 req/min per (apiKey, endpoint)
  const rl = checkRateLimitOrError(ctx.credential.id, "data.read", 100, 60_000);
  if (rl) return rl;

  // Quota enforcement: api_requests
  const quotaErr = await enforceQuota(ctx, "api_requests");
  if (quotaErr) return quotaErr;

  const { table: tableName } = await params;

  const table = await db.dataTable.findUnique({
    where: {
      environmentId_name: {
        environmentId: ctx.environment.id,
        name: tableName,
      },
    },
    include: { policies: true },
  });
  if (!table || table.status !== "active") return err("NOT_FOUND", "جدول یافت نشد.", 404);

  const { user } = await resolveProjectUser(ctx);
  const isService = ctx.credential.kind === "server_secret" || ctx.credential.kind === "admin";

  if (!policyAllows(table.policies, "select", { hasUser: !!user, isService, isOwner: false })) {
    return err("FORBIDDEN", "اجازه خواندن ندارید.", 403);
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? "20"));
  const parsedFilter = parseRecordFilter(url.searchParams.get("filter"));
  if (!parsedFilter.ok) return err("VALIDATION_ERROR", parsedFilter.error, 422);
  // Owner-scoped: if only "owner" subject policies, filter by ownerUserId
  const onlyOwner = table.policies.some((p) => p.operation === "select" && p.subject === "owner" && p.enabled) &&
    !table.policies.some((p) => p.operation === "select" && (p.subject === "anonymous" || p.subject === "authenticated" || p.subject === "service") && p.enabled);
  const where = {
    environmentId: ctx.environment.id,
    dataTableId: table.id,
    AND: recordFilterWhere(parsedFilter.filter),
    ...(onlyOwner && user ? { ownerUserId: user.id } : {}),
  };

  const [records, total] = await Promise.all([
    db.dataRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.dataRecord.count({ where }),
  ]);

  return ok({
    records: records.map((r) => ({
      id: r.id,
      data: readRecordData(r.data),
      ownerUserId: r.ownerUserId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total,
    page,
    pageSize,
  });
}

// POST /api/v1/data/{table} — create record
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);

  // Rate limit: 30 req/min per (apiKey, endpoint) for writes
  const rl = checkRateLimitOrError(ctx.credential.id, "data.write", 30, 60_000);
  if (rl) return rl;

  // Quota enforcement: api_requests
  const quotaErr = await enforceQuota(ctx, "api_requests");
  if (quotaErr) return quotaErr;

  const { table: tableName } = await params;

  const table = await db.dataTable.findUnique({
    where: {
      environmentId_name: {
        environmentId: ctx.environment.id,
        name: tableName,
      },
    },
    include: { policies: true },
  });
  if (!table || table.status !== "active") return err("NOT_FOUND", "جدول یافت نشد.", 404);

  const { user } = await resolveProjectUser(ctx);
  const isService = ctx.credential.kind === "server_secret" || ctx.credential.kind === "admin";
  if (!policyAllows(table.policies, "insert", { hasUser: !!user, isService, isOwner: false })) {
    return err("FORBIDDEN", "اجازه نوشتن ندارید.", 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json() as Record<string, unknown>;
  } catch {
    return err("INVALID_JSON", "بدنه درخواست JSON نامعتبر است.", 400);
  }
  const schema = JSON.parse(table.schemaDefinition) as SchemaDefinition;
  const result = validateRecord(schema, payload, "insert");
  if (!result.ok) return err("VALIDATION_ERROR", result.error, 422);

  const record = await db.dataRecord.create({
    data: {
      dataTableId: table.id,
      environmentId: ctx.environment.id,
      data: toJsonValue(result.data),
      ownerUserId: user?.id ?? null,
    },
  });
  return ok({
    record: {
      id: record.id,
      data: readRecordData(record.data),
      ownerUserId: record.ownerUserId,
      createdAt: record.createdAt,
    },
  });
}
