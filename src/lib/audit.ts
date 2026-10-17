import { db } from "@/lib/db";

export type AuditAction =
  | "platform_user.signup"
  | "platform_user.login"
  | "platform_user.logout"
  | "platform_user.failed_login"
  | "organization.create"
  | "organization.update"
  | "organization.suspend"
  | "project.create"
  | "project.update"
  | "project.archive"
  | "environment.create"
  | "environment.update"
  | "environment.suspend"
  | "credential.create"
  | "credential.revoke"
  | "credential.rotate"
  | "member.invite"
  | "member.update_role"
  | "member.remove";

export type AuditInput = {
  organizationId?: string | null;
  projectId?: string | null;
  environmentId?: string | null;
  actorType?: "platform_user" | "system" | "api_credential";
  actorId?: string | null;
  action: AuditAction | string;
  resourceType?: string | null;
  resourceId?: string | null;
  request?: Request | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Redact sensitive fields from audit metadata.
 */
function redact(input: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const sensitiveKeys = [
    "password", "passwordHash", "token", "tokenHash", "secret", "apiKey",
    "secretHash", "authorization", "cookie", "otp", "code", "refreshToken",
  ];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    const key = k.toLowerCase();
    if (sensitiveKeys.some(s => key.includes(s))) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.length > 256) {
      out[k] = v.slice(0, 256) + "…[truncated]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const forwardedFor = input.request?.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || null;
    const ua = input.request?.headers.get("user-agent")?.slice(0, 256) || null;

    await db.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        projectId: input.projectId ?? null,
        environmentId: input.environmentId ?? null,
        actorType: input.actorType ?? "platform_user",
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        ipAddress: ip,
        userAgent: ua,
        metadata: redact(input.metadata) ? JSON.stringify(redact(input.metadata)) : null,
      },
    });
  } catch (err) {
    // Audit logging must never break the request flow.
    console.error("[audit] failed to record", err);
  }
}
