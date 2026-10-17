import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { getDataPlaneOverride } from "@/lib/auth/data-plane-override";
import { resolveDataPlaneContext, destroyProjectSession } from "@/lib/auth/project/data-plane";
import { err, ok } from "@/lib/api/response";

export async function POST(_req: NextRequest) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر است.", 401);

  const override = getDataPlaneOverride();
  const bearer = override ? override.authorization : (await headers()).get("authorization");
  if (!bearer || !bearer.startsWith("Bearer ")) return ok({ ok: true });
  const token = bearer.slice(7).trim();
  if (token && !token.startsWith("atr_")) {
    await destroyProjectSession(token);
  }
  return ok({ ok: true });
}
