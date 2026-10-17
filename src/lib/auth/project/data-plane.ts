import { headers } from "next/headers";
import { db } from "@/lib/db";
import { hashSecret, generateSessionToken } from "@/lib/security/crypto";
import { getDataPlaneOverride } from "@/lib/auth/data-plane-override";
import type { ApiCredential, Environment, Project, ProjectUser, ProjectSession } from "@prisma/client";

/**
 * Data-plane auth context: resolves the calling credential + environment + project
 * from the request's `x-atrina-key` header. Used by /api/v1/* endpoints.
 *
 * Returns null if no valid credential is found. NEVER trusts a client-provided
 * project_id / environment_id.
 */
export type DataPlaneContext = {
  credential: ApiCredential & { environment: Environment & { project: Project } };
  environment: Environment & { project: Project };
  project: Project;
};

export async function resolveDataPlaneContext(): Promise<{
  ctx: DataPlaneContext | null;
  error?: string;
}> {
  const override = getDataPlaneOverride();
  if (override) return { ctx: override.ctx };

  const h = await headers();

  // Accept either x-atrina-key or Authorization: Bearer
  const headerKey = h.get("x-atrina-key");
  const bearer = h.get("authorization");
  let rawKey: string | null = null;
  if (headerKey) rawKey = headerKey.trim();
  else if (bearer && bearer.startsWith("Bearer ") && !bearer.startsWith("Bearer atr_")) {
    // Bearer token that's not an atr_ key is a project user session — handled separately
    rawKey = null;
  }
  if (!rawKey) return { ctx: null, error: "missing_api_key" };

  // Format: atr_pk_<envslug>_<random> OR atr_sk_<envslug>_<random> OR atr_adm_<envslug>_<random>
  // The slug is NOT used to find the environment. Lookup is by secret hash, which
  // is unique, so two projects that share an environment slug cannot collide.
  const parts = rawKey.split("_");
  if (parts.length < 4 || parts[0] !== "atr") {
    return { ctx: null, error: "invalid_key_format" };
  }
  const kindCode = parts[1]; // pk | sk | adm
  const envSlug = parts[2];
  const kindMap: Record<string, string> = { pk: "publishable", sk: "server_secret", adm: "admin" };
  const kind = kindMap[kindCode];
  if (!kind) return { ctx: null, error: "invalid_key_kind" };

  const secretHash = hashSecret(rawKey);
  const cred = await db.apiCredential.findUnique({
    where: { secretHash },
    include: { environment: { include: { project: true } } },
  });
  if (!cred || cred.status !== "active") return { ctx: null, error: "invalid_key" };
  if (cred.kind !== kind) return { ctx: null, error: "invalid_key_kind" };
  if (cred.environment.slug !== envSlug || cred.environment.status !== "active") {
    return { ctx: null, error: "env_not_found" };
  }
  if (cred.environment.project.deletedAt) return { ctx: null, error: "env_not_found" };

  void db.apiCredential
    .update({ where: { id: cred.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    ctx: {
      credential: cred,
      environment: cred.environment,
      project: cred.environment.project,
    },
  };
}

/**
 * Resolve a project user from an Authorization: Bearer token (separate from
 * the API key). Returns null if no valid session.
 */
export async function resolveProjectUser(ctx: DataPlaneContext): Promise<{
  user: ProjectUser | null;
  session: ProjectSession | null;
}> {
  const override = getDataPlaneOverride();
  const bearer = override
    ? override.authorization
    : (await headers()).get("authorization");
  if (!bearer || !bearer.startsWith("Bearer ")) return { user: null, session: null };
  const token = bearer.slice(7).trim();
  if (!token) return { user: null, session: null };

  // Avoid matching the API key itself — only accept tokens that look like a session token (no atr_ prefix)
  if (token.startsWith("atr_")) return { user: null, session: null };

  const tokenHash = hashSecret(token);
  const session = await db.projectSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return { user: null, session: null };
  if (session.revokedAt) return { user: null, session: null };
  if (session.expiresAt < new Date()) return { user: null, session: null };

  // Ensure session belongs to same project/env as the ctx
  if (session.user.projectId !== ctx.project.id || session.user.environmentId !== ctx.environment.id) {
    return { user: null, session: null };
  }
  if (session.user.status !== "active") return { user: null, session: null };

  // Bump lastUsedAt
  void db.projectSession
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return { user: session.user, session };
}

/**
 * Create a project-user session and return the raw token (only once).
 */
export async function createProjectSession(userId: string): Promise<string> {
  const token = generateSessionToken(40);
  const tokenHash = hashSecret(token);
  const h = await headers();
  await db.projectSession.create({
    data: {
      userId,
      tokenHash,
      userAgent: h.get("user-agent")?.slice(0, 256) ?? null,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    },
  });
  await db.projectUser.update({
    where: { id: userId },
    data: { lastSignInAt: new Date() },
  });
  return token;
}

export async function destroyProjectSession(token: string): Promise<void> {
  const tokenHash = hashSecret(token);
  await db.projectSession.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });
}
