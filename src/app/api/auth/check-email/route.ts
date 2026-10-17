import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api/response";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(255).transform((s) => s.toLowerCase().trim()),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return ok({ available: false });
  }
  const existing = await db.platformUser.findUnique({
    where: { email: parsed.email },
  });
  return ok({ available: existing === null });
}
