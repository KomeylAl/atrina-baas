import { NextRequest } from "next/server";
import { resolveDataPlaneContext, resolveProjectUser } from "@/lib/auth/project/data-plane";
import { err, ok } from "@/lib/api/response";

export async function GET(_req: NextRequest) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر است.", 401);
  const { user } = await resolveProjectUser(ctx);
  if (!user) return err("UNAUTHORIZED", "نشست نامعتبر است.", 401);

  return ok({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
    },
  });
}
