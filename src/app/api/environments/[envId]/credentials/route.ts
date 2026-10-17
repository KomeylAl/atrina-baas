import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { generateApiSecret, hashSecret } from "@/lib/security/crypto";
import { z } from "zod";

// List credentials for an environment (no secrets returned)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ envId: string }> }
) {
  const user = await requireUser();
  const { envId } = await params;

  const env = await db.environment.findUnique({
    where: { id: envId },
    include: { project: true },
  });
  if (!env) return err("NOT_FOUND", "محیط یافت نشد.", 404);

  const ctx = await resolveProjectForUser(user, env.projectId);
  if (!ctx) return err("FORBIDDEN", "دسترسی ندارید.", 403);

  const credentials = await db.apiCredential.findMany({
    where: { environmentId: envId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      kind: true,
      scopes: true,
      status: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  return ok({ credentials });
}

const createSchema = z.object({
  name: z.string().min(2).max(60),
  kind: z.enum(["publishable", "server_secret", "admin"]),
  scopes: z.array(z.string()).max(20).default([]),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

const KIND_PREFIX: Record<string, string> = {
  publishable: "atr_pk",
  server_secret: "atr_sk",
  admin: "atr_adm",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ envId: string }> }
) {
  const user = await requireUser();
  const { envId } = await params;

  const env = await db.environment.findUnique({
    where: { id: envId },
    include: { project: true },
  });
  if (!env) return err("NOT_FOUND", "محیط یافت نشد.", 404);

  const ctx = await resolveProjectForUser(user, env.projectId);
  if (!ctx) return err("FORBIDDEN", "دسترسی ندارید.", 403);
  const denied = rejectRole(ctx.role, "credentials");
  if (denied) return denied;

  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  const prefix = KIND_PREFIX[parsed.kind] ?? "atr_pk";
  const { fullSecret, keyPrefix } = generateApiSecret(prefix, env.slug);
  const secretHash = hashSecret(fullSecret);

  const expiresAt = parsed.expiresInDays
    ? new Date(Date.now() + parsed.expiresInDays * 24 * 3600 * 1000)
    : null;

  const credential = await db.apiCredential.create({
    data: {
      environmentId: envId,
      name: parsed.name,
      keyPrefix,
      secretHash,
      kind: parsed.kind,
      scopes: JSON.stringify(parsed.scopes),
      status: "active",
      expiresAt,
      createdById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "credential.create",
    resourceType: "api_credential",
    resourceId: credential.id,
    organizationId: ctx.organization.id,
    projectId: env.projectId,
    environmentId: envId,
    request: req,
    metadata: { name: parsed.name, kind: parsed.kind, expiresAt },
  });

  // secret is returned ONLY here, never retrievable again
  return ok({
    credential: {
      id: credential.id,
      name: credential.name,
      kind: credential.kind,
      keyPrefix: credential.keyPrefix,
      status: credential.status,
      createdAt: credential.createdAt,
      expiresAt: credential.expiresAt,
    },
    secret: fullSecret,
    warning:
      "این کلید فقط یک بار نمایش داده می‌شود. آن را در یک محل امن ذخیره کنید.",
  });
}
