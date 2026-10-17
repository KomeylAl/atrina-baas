import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/security/crypto";
import { decideLogin } from "@/lib/auth/login-decision";
import { createSession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(255).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    const msg = zErr.errors?.[0]?.message ?? "ورودی نامعتبر است";
    return err("VALIDATION_ERROR", msg, 422);
  }

  const user = await db.platformUser.findUnique({
    where: { email: parsed.email },
  });

  const passwordMatches =
    !!user?.passwordHash && verifyPassword(parsed.password, user.passwordHash);
  const decision = decideLogin({
    userExists: !!user,
    active: user?.status === "active",
    hasPassword: !!user?.passwordHash,
    passwordMatches,
  });

  if (!decision.ok || !user) {
    await recordAudit({
      actorType: "platform_user",
      actorId: user?.id ?? null,
      action: "platform_user.failed_login",
      resourceType: "platform_user",
      resourceId: user?.id ?? null,
      request: req,
      metadata: { email: parsed.email, reason: decision.ok ? "no_user_or_inactive" : decision.reason },
    });
    return err("INVALID_CREDENTIALS", "ایمیل یا رمز عبور اشتباه است.", 401);
  }

  await createSession(user.id, req);
  await recordAudit({
    actorType: "platform_user",
    actorId: user.id,
    action: "platform_user.login",
    resourceType: "platform_user",
    resourceId: user.id,
    request: req,
    metadata: { email: parsed.email },
  });

  return ok({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
    },
  });
}
