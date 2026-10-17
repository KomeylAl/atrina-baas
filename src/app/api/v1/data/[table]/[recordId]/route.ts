import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveDataPlaneContext, resolveProjectUser } from "@/lib/auth/project/data-plane";
import { validateRecord, policyAllows, type SchemaDefinition } from "@/lib/data/schema";
import { readRecordData, toJsonValue } from "@/lib/data/record-filter";
import { err, ok } from "@/lib/api/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ table: string; recordId: string }> }
) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);
  const { table: tableName, recordId } = await params;

  const table = await db.dataTable.findUnique({
    where: { environmentId_name: { environmentId: ctx.environment.id, name: tableName } },
    include: { policies: true },
  });
  if (!table || table.status !== "active") return err("NOT_FOUND", "جدول یافت نشد.", 404);

  const { user } = await resolveProjectUser(ctx);
  const isService = ctx.credential.kind === "server_secret" || ctx.credential.kind === "admin";
  const record = await db.dataRecord.findUnique({ where: { id: recordId } });
  if (!record || record.dataTableId !== table.id) return err("NOT_FOUND", "رکورد یافت نشد.", 404);

  const isOwner = !!user && record.ownerUserId === user.id;
  if (!policyAllows(table.policies, "select", { hasUser: !!user, isService, isOwner })) {
    return err("FORBIDDEN", "اجازه خواندن ندارید.", 403);
  }
  return ok({
    record: {
      id: record.id,
      data: readRecordData(record.data),
      ownerUserId: record.ownerUserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ table: string; recordId: string }> }
) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);
  const { table: tableName, recordId } = await params;

  const table = await db.dataTable.findUnique({
    where: { environmentId_name: { environmentId: ctx.environment.id, name: tableName } },
    include: { policies: true },
  });
  if (!table || table.status !== "active") return err("NOT_FOUND", "جدول یافت نشد.", 404);

  const { user } = await resolveProjectUser(ctx);
  const isService = ctx.credential.kind === "server_secret" || ctx.credential.kind === "admin";
  const record = await db.dataRecord.findUnique({ where: { id: recordId } });
  if (!record || record.dataTableId !== table.id) return err("NOT_FOUND", "رکورد یافت نشد.", 404);

  const isOwner = !!user && record.ownerUserId === user.id;
  if (!policyAllows(table.policies, "update", { hasUser: !!user, isService, isOwner })) {
    return err("FORBIDDEN", "اجازه ویرایش ندارید.", 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json() as Record<string, unknown>;
  } catch {
    return err("INVALID_JSON", "JSON نامعتبر.", 400);
  }
  const schema = JSON.parse(table.schemaDefinition) as SchemaDefinition;
  const current = readRecordData(record.data);
  const merged = {
    ...(current && typeof current === "object" && !Array.isArray(current) ? current as Record<string, unknown> : {}),
    ...payload,
  };
  const result = validateRecord(schema, merged, "update");
  if (!result.ok) return err("VALIDATION_ERROR", result.error, 422);

  const updated = await db.dataRecord.update({
    where: { id: recordId },
    data: { data: toJsonValue(result.data) },
  });
  return ok({
    record: {
      id: updated.id,
      data: readRecordData(updated.data),
      ownerUserId: updated.ownerUserId,
      updatedAt: updated.updatedAt,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ table: string; recordId: string }> }
) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);
  const { table: tableName, recordId } = await params;

  const table = await db.dataTable.findUnique({
    where: { environmentId_name: { environmentId: ctx.environment.id, name: tableName } },
    include: { policies: true },
  });
  if (!table || table.status !== "active") return err("NOT_FOUND", "جدول یافت نشد.", 404);

  const { user } = await resolveProjectUser(ctx);
  const isService = ctx.credential.kind === "server_secret" || ctx.credential.kind === "admin";
  const record = await db.dataRecord.findUnique({ where: { id: recordId } });
  if (!record || record.dataTableId !== table.id) return err("NOT_FOUND", "رکورد یافت نشد.", 404);

  const isOwner = !!user && record.ownerUserId === user.id;
  if (!policyAllows(table.policies, "delete", { hasUser: !!user, isService, isOwner })) {
    return err("FORBIDDEN", "اجازه حذف ندارید.", 403);
  }
  await db.dataRecord.delete({ where: { id: recordId } });
  return ok({ ok: true });
}
