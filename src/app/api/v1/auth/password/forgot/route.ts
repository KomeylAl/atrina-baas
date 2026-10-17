import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveDataPlaneContext } from "@/lib/auth/project/data-plane";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(255).transform((s) => s.toLowerCase().trim()),
});

export async function POST(req: NextRequest) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر است.", 401);

  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return err("VALIDATION_ERROR", "ایمیل نامعتبر", 422);
  }

  // Always return ok to prevent account enumeration.
  const user = await db.projectUser.findUnique({
    where: {
      projectId_environmentId_email: {
        projectId: ctx.project.id,
        environmentId: ctx.environment.id,
        email: parsed.email,
      },
    },
  });
  // In a real impl, we'd queue an email with a reset token. For demo: just acknowledge.
  // If user exists, mark a reset request in audit.
  if (user) {
    // No-op for mock; in real impl: queue email with token.
  }
  return ok({ ok: true, message: "در صورت وجود حساب، ایمیل بازنشانی ارسال شده است." });
}
