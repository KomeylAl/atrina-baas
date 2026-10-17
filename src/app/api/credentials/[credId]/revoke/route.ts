import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { generateApiSecret, hashSecret } from "@/lib/security/crypto";

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

  const ctx = await resolveProjectForUser(user, cred.environment.projectId);
  if (!ctx) return err("FORBIDDEN", "دسترسی ندارید.", 403);
  const denied = rejectRole(ctx.role, "credentials");
  if (denied) return denied;

  const updated = await db.apiCredential.update({
    where: { id: credId },
    data: { status: "revoked", revokedAt: new Date() },
  });

  await recordAudit({
    actorId: user.id,
    action: "credential.revoke",
    resourceType: "api_credential",
    resourceId: credId,
    organizationId: ctx.organization.id,
    projectId: cred.environment.projectId,
    environmentId: cred.environmentId,
    request: req,
    metadata: { name: cred.name, kind: cred.kind },
  });

  return ok({ credential: { id: updated.id, status: updated.status } });
}
