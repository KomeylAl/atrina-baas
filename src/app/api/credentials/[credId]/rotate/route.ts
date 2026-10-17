import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { generateApiSecret, hashSecret } from "@/lib/security/crypto";

const KIND_PREFIX: Record<string, string> = {
  publishable: "atr_pk",
  server_secret: "atr_sk",
  admin: "atr_adm",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ credId: string }> }
) {
  const user = await requireUser();
  const { credId } = await params;

  const cred = await db.apiCredential.findUnique({
    where: { id: credId },
    include: { environment: { include: { project: true } } },
  });
  if (!cred) return err("NOT_FOUND", "کلید یافت نشد.", 404);
  if (cred.status === "revoked") return err("REVOKED", "این کلید قبلاً ابطال شده است.", 409);

  const ctx = await resolveProjectForUser(user, cred.environment.projectId);
  if (!ctx) return err("FORBIDDEN", "دسترسی ندارید.", 403);
  const denied = rejectRole(ctx.role, "credentials");
  if (denied) return denied;

  // Generate new secret and revoke old record, create new record
  const prefix = KIND_PREFIX[cred.kind] ?? "atr_pk";
  const { fullSecret, keyPrefix } = generateApiSecret(prefix, cred.environment.slug);
  const secretHash = hashSecret(fullSecret);

  const [newCred] = await db.$transaction([
    db.apiCredential.update({
      where: { id: credId },
      data: { status: "revoked", revokedAt: new Date() },
    }),
    db.apiCredential.create({
      data: {
        environmentId: cred.environmentId,
        name: cred.name,
        keyPrefix,
        secretHash,
        kind: cred.kind,
        scopes: cred.scopes,
        status: "active",
        expiresAt: cred.expiresAt,
        createdById: user.id,
      },
    }),
  ]);

  await recordAudit({
    actorId: user.id,
    action: "credential.rotate",
    resourceType: "api_credential",
    resourceId: newCred.id,
    organizationId: ctx.organization.id,
    projectId: cred.environment.projectId,
    environmentId: cred.environmentId,
    request: req,
    metadata: { name: cred.name, kind: cred.kind, oldCredId: credId },
  });

  return ok({
    credential: {
      id: newCred.id,
      name: newCred.name,
      kind: newCred.kind,
      keyPrefix: newCred.keyPrefix,
      status: newCred.status,
      createdAt: newCred.createdAt,
      expiresAt: newCred.expiresAt,
    },
    secret: fullSecret,
    warning:
      "کلید قبلی ابطال شد. این کلید جدید فقط یک بار نمایش داده می‌شود.",
  });
}
