import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/security/crypto";
import { createSession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(255).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(80).optional(),
  // First org (optional — if not given we'll create a default personal org)
  organizationName: z.string().min(2).max(80).optional(),
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

  const existing = await db.platformUser.findUnique({
    where: { email: parsed.email },
  });
  if (existing) {
    // Avoid account enumeration — return generic message
    return err("EMAIL_IN_USE", "این ایمیل قبلاً ثبت شده است.", 409);
  }

  const passwordHash = hashPassword(parsed.password);

  // Create organization slug from provided name or default
  const orgName = parsed.organizationName ?? "سازمان من";
  const orgBaseSlug = slugify(orgName);
  const orgSlug = await uniqueSlug(
    async (c) => (await db.organization.findUnique({ where: { slug: c } })) !== null,
    orgBaseSlug
  );

  const result = await db.$transaction(async (tx) => {
    const user = await tx.platformUser.create({
      data: {
        email: parsed.email,
        passwordHash,
        displayName: parsed.displayName ?? null,
        status: "active",
        emailVerifiedAt: null,
      },
    });

    const org = await tx.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        status: "active",
      },
    });

    // Owner membership
    await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
        status: "active",
      },
    });

    return { user, org };
  });

  await createSession(result.user.id, req);
  await recordAudit({
    actorId: result.user.id,
    action: "platform_user.signup",
    resourceType: "platform_user",
    resourceId: result.user.id,
    organizationId: result.org.id,
    request: req,
    metadata: { email: parsed.email, displayName: parsed.displayName ?? null },
  });

  return ok({
    user: {
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      status: result.user.status,
    },
    organization: {
      id: result.org.id,
      name: result.org.name,
      slug: result.org.slug,
    },
  });
}
