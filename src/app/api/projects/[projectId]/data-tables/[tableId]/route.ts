import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { validateSchema } from "@/lib/data/schema";
import { err, ok } from "@/lib/api/response";
import { parseRecordFilter, readRecordData, recordFilterWhere } from "@/lib/data/record-filter";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; tableId: string }> }
) {
  const user = await requireUser();
  const { projectId, tableId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const table = await db.dataTable.findUnique({
    where: { id: tableId },
    include: { policies: true, environment: { select: { id: true, name: true, projectId: true } } },
  });
  if (!table || table.environment.projectId !== projectId) {
    return err("NOT_FOUND", "جدول یافت نشد.", 404);
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? "20"));
  const parsedFilter = parseRecordFilter(url.searchParams.get("filter"));
  if (!parsedFilter.ok) return err("VALIDATION_ERROR", parsedFilter.error, 422);
  const where = { dataTableId: tableId, AND: recordFilterWhere(parsedFilter.filter) };

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
    table: {
      id: table.id,
      name: table.name,
      displayName: table.displayName,
      schemaDefinition: JSON.parse(table.schemaDefinition),
      status: table.status,
      environment: table.environment,
      policies: table.policies,
    },
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

const patchSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "نام جدول نامعتبر").optional(),
  displayName: z.string().max(80).nullable().optional(),
  schemaDefinition: z.unknown().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; tableId: string }> }
) {
  const user = await requireUser();
  const { projectId, tableId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;

  const table = await db.dataTable.findUnique({
    where: { id: tableId },
    include: { environment: true, _count: { select: { records: true } } },
  });
  if (!table || table.environment.projectId !== projectId) {
    return err("NOT_FOUND", "جدول یافت نشد.", 404);
  }

  let parsed;
  try {
    parsed = patchSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  const data: { name?: string; displayName?: string | null; schemaDefinition?: string } = {};
  if (parsed.name && parsed.name !== table.name) {
    if (table._count.records > 0) {
      return err("NAME_LOCKED", "این جدول رکورد دارد و نام API آن قابل تغییر نیست.", 409);
    }
    const existing = await db.dataTable.findUnique({
      where: { environmentId_name: { environmentId: table.environmentId, name: parsed.name } },
    });
    if (existing) return err("NAME_IN_USE", "نام جدول تکراری است.", 409);
    data.name = parsed.name;
  }
  if (parsed.displayName !== undefined) data.displayName = parsed.displayName;
  if (parsed.schemaDefinition !== undefined) {
    const schemaResult = validateSchema(parsed.schemaDefinition);
    if (!schemaResult.ok) return err("SCHEMA_INVALID", schemaResult.error, 422);
    data.schemaDefinition = JSON.stringify(schemaResult.schema);
  }

  const updated = await db.dataTable.update({ where: { id: table.id }, data });
  await recordAudit({
    actorId: user.id,
    action: "data_table.update",
    resourceType: "data_table",
    resourceId: table.id,
    organizationId: ctx.organization.id,
    projectId,
    environmentId: table.environmentId,
    request: req,
    metadata: { name: updated.name },
  });

  return ok({
    table: {
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      schemaDefinition: JSON.parse(updated.schemaDefinition),
      status: updated.status,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; tableId: string }> }
) {
  const user = await requireUser();
  const { projectId, tableId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;
  const table = await db.dataTable.findUnique({ where: { id: tableId } });
  if (!table) return err("NOT_FOUND", "جدول یافت نشد.", 404);

  const env = await db.environment.findUnique({ where: { id: table.environmentId } });
  if (!env || env.projectId !== projectId) return err("NOT_FOUND", "جدول یافت نشد.", 404);

  await db.dataTable.delete({ where: { id: tableId } });
  return ok({ ok: true });
}
