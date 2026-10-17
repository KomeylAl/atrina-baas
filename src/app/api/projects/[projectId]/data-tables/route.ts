import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { validateSchema } from "@/lib/data/schema";
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

  const tables = await db.dataTable.findMany({
    where,
    include: {
      environment: { select: { id: true, name: true, slug: true } },
      _count: { select: { records: true, policies: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    tables: tables.map((t) => ({
      id: t.id,
      name: t.name,
      displayName: t.displayName,
      schemaDefinition: JSON.parse(t.schemaDefinition),
      status: t.status,
      environment: t.environment,
      recordsCount: t._count.records,
      policiesCount: t._count.policies,
      createdAt: t.createdAt,
    })),
  });
}

const createSchema = z.object({
  environmentId: z.string().min(1),
  name: z.string().min(1).max(64).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "نام جدول نامعتبر"),
  displayName: z.string().max(80).optional(),
  schemaDefinition: z.unknown().optional(),
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
  // Verify env belongs to project
  const env = await db.environment.findUnique({ where: { id: parsed.environmentId } });
  if (!env || env.projectId !== projectId) return err("NOT_FOUND", "محیط یافت نشد.", 404);

  const schemaResult = validateSchema(parsed.schemaDefinition ?? { columns: [] });
  if (!schemaResult.ok) return err("SCHEMA_INVALID", schemaResult.error, 422);

  // Check unique name
  const existing = await db.dataTable.findUnique({
    where: { environmentId_name: { environmentId: env.id, name: parsed.name } },
  });
  if (existing) return err("NAME_IN_USE", "نام جدول تکراری است.", 409);

  const table = await db.dataTable.create({
    data: {
      environmentId: env.id,
      name: parsed.name,
      displayName: parsed.displayName ?? null,
      schemaDefinition: JSON.stringify(schemaResult.schema),
      status: "active",
    },
  });
  // Default policies: allow authenticated users to read+write, service to read all
  await db.dataPolicy.createMany({
    data: [
      { dataTableId: table.id, operation: "select", subject: "authenticated", policyDefinition: JSON.stringify({}), enabled: true },
      { dataTableId: table.id, operation: "insert", subject: "authenticated", policyDefinition: JSON.stringify({}), enabled: true },
      { dataTableId: table.id, operation: "update", subject: "owner", policyDefinition: JSON.stringify({}), enabled: true },
      { dataTableId: table.id, operation: "delete", subject: "owner", policyDefinition: JSON.stringify({}), enabled: true },
      { dataTableId: table.id, operation: "select", subject: "service", policyDefinition: JSON.stringify({}), enabled: true },
    ],
  });

  await recordAudit({
    actorId: user.id,
    action: "data_table.create",
    resourceType: "data_table",
    resourceId: table.id,
    organizationId: ctx.organization.id,
    projectId,
    environmentId: env.id,
    request: req,
    metadata: { name: table.name },
  });
  return ok({ table });
}
