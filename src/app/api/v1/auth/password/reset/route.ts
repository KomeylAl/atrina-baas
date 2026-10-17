import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/security/crypto";
import { resolveDataPlaneContext } from "@/lib/auth/project/data-plane";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(255).transform((s) => s.toLowerCase().trim()),
  newPassword: z.string().min(8).max(128),
  // Mock: a reset token. In a real impl we'd verify the token signature.
  resetToken: z.string().min(1).max(256).optional(),
});

export async function POST(req: NextRequest) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر است.", 401);

  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  const user = await db.projectUser.findUnique({
    where: {
      projectId_environmentId_email: {
        projectId: ctx.project.id,
        environmentId: ctx.environment.id,
        email: parsed.email,
      },
    },
  });
  if (!user) return err("NOT_FOUND", "حساب یافت نشد.", 404);

  // Mock: in real impl, verify the reset token signature and expiry here.
  // For demo, we accept any non-empty resetToken.
  if (!parsed.resetToken) return err("INVALID_TOKEN", "توکن بازنشانی نامعتبر است.", 400);

  await db.projectUser.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(parsed.newPassword) },
  });
  // Revoke all sessions
  await db.projectSession.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return ok({ ok: true });
}
