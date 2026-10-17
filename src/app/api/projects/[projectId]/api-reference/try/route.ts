import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { err, ok } from "@/lib/api/response";
import { invokeDataPlane } from "@/lib/api/invoke-v1";
import type { DataPlaneContext } from "@/lib/auth/project/data-plane";
import { z } from "zod";

/**
 * POST /api/projects/{projectId}/api-reference/try
 *
 * Runs the data-plane handler in this process. The credential is loaded from
 * the database after the dashboard session and project role are checked.
 * No client-supplied header is treated as authentication.
 */
const schema = z.object({
  environmentId: z.string().min(1),
  credentialId: z.string().min(1),
  method: z.enum(["GET", "POST", "PATCH", "DELETE"]),
  path: z.string().min(1).max(256).startsWith("/"),
  body: z.unknown().optional(),
  userToken: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const access = await resolveProjectForUser(user, projectId);
  if (!access) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(access.role, "operate");
  if (denied) return denied;

  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  const env = await db.environment.findUnique({ where: { id: parsed.environmentId } });
  if (!env || env.projectId !== projectId) {
    return err("NOT_FOUND", "محیط یافت نشد.", 404);
  }

  const cred = await db.apiCredential.findUnique({
    where: { id: parsed.credentialId },
    include: { environment: { include: { project: true } } },
  });
  if (!cred || cred.environmentId !== env.id || cred.status !== "active") {
    return err("NOT_FOUND", "کلید یافت نشد یا ابطال شده.", 404);
  }

  const ctx: DataPlaneContext = {
    credential: cred,
    environment: cred.environment,
    project: cred.environment.project,
  };

  const response = await invokeDataPlane({
    ctx,
    method: parsed.method,
    path: parsed.path,
    body: parsed.body,
    authorization: parsed.userToken ? `Bearer ${parsed.userToken}` : null,
  });

  const text = await response.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep as text */
  }

  return ok({
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: json,
  });
}
