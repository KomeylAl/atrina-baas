import { NextRequest } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { ok } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await recordAudit({
      actorId: user.id,
      action: "platform_user.logout",
      resourceType: "platform_user",
      resourceId: user.id,
      request: req,
      metadata: null,
    });
  }
  return ok({ ok: true });
}
