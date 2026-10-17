import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api/response";
import { slugify } from "@/lib/utils/slug";
import { z } from "zod";

const schema = z.object({
  slug: z.string().min(2).max(60),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return ok({ available: false, slug: "" });
  }
  const candidate = slugify(parsed.slug);
  if (!candidate) return ok({ available: false, slug: "" });
  const taken = await db.organization.findUnique({ where: { slug: candidate } });
  return ok({ available: taken === null, slug: candidate });
}
