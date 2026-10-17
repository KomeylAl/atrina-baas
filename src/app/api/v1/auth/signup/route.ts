import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/security/crypto";
import { resolveDataPlaneContext, createProjectSession } from "@/lib/auth/project/data-plane";
import { checkRateLimitOrError } from "@/lib/security/rate-limit";
import { err, ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(255).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(80).optional(),
});

export async function POST(req: NextRequest) {
  const { ctx, error } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر است.", 401);

  // Rate limit: 5 signups/min per apiKey
  const rl = checkRateLimitOrError(ctx.credential.id, "auth.signup", 5, 60_000);
  if (rl) return rl;

  // Only publishable keys can signup users
  if (ctx.credential.kind !== "publishable") {
    return err("FORBIDDEN", "این عملیات فقط با کلید publishable مجاز است.", 403);
  }

  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  // Check uniqueness within this project+env
  const existing = await db.projectUser.findUnique({
    where: {
      projectId_environmentId_email: {
        projectId: ctx.project.id,
        environmentId: ctx.environment.id,
        email: parsed.email,
      },
    },
  });
  if (existing) {
    return err("EMAIL_IN_USE", "این ایمیل قبلاً ثبت شده است.", 409);
  }

  const user = await db.projectUser.create({
    data: {
      projectId: ctx.project.id,
      environmentId: ctx.environment.id,
      email: parsed.email,
      passwordHash: hashPassword(parsed.password),
      displayName: parsed.displayName ?? null,
      status: "active",
    },
  });

  const token = await createProjectSession(user.id);

  await recordAudit({
    actorType: "api_credential",
    actorId: ctx.credential.id,
    action: "project_user.signup",
    resourceType: "project_user",
    resourceId: user.id,
    organizationId: ctx.project.organizationId,
    projectId: ctx.project.id,
    environmentId: ctx.environment.id,
    request: req,
    metadata: { email: parsed.email },
  });

  return ok({
    user: { id: user.id, email: user.email, displayName: user.displayName, status: user.status },
    token,
  });
}
