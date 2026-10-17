import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import { z } from "zod";

export async function GET() {
  const user = await requireUser();
  // Return orgs the user is a member of, with project counts
  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id, status: "active", organization: { status: "active" } },
    include: {
      organization: {
        include: {
          projects: {
            where: { deletedAt: null },
            select: { id: true, name: true, slug: true, status: true, createdAt: true },
          },
        },
      },
    },
  });

  return ok({
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      status: m.organization.status,
      role: m.role,
      createdAt: m.organization.createdAt,
      projects: m.organization.projects,
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  const slugBase = slugify(parsed.slug ?? parsed.name);
  const slug = await uniqueSlug(
    async (c) => (await db.organization.findUnique({ where: { slug: c } })) !== null,
    slugBase
  );

  const org = await db.organization.create({
    data: { name: parsed.name, slug, status: "active" },
  });
  await db.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: "owner", status: "active" },
  });

  await recordAudit({
    actorId: user.id,
    action: "organization.create",
    resourceType: "organization",
    resourceId: org.id,
    organizationId: org.id,
    request: req,
    metadata: { name: org.name, slug: org.slug },
  });

  return ok({ organization: { id: org.id, name: org.name, slug: org.slug } });
}
