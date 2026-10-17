import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import { z } from "zod";

// List environments for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const environments = await db.environment.findMany({
    where: { projectId },
    include: { _count: { select: { credentials: true } } },
    orderBy: { createdAt: "asc" },
  });

  return ok({
    environments: environments.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      type: e.type,
      status: e.status,
      createdAt: e.createdAt,
      credentialsCount: e._count.credentials,
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(60).optional(),
  type: z.enum(["development", "staging", "production", "custom"]).default("custom"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;

  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  const slugBase = slugify(parsed.slug ?? parsed.name);
  const slug = await uniqueSlug(
    async (c) =>
      (await db.environment.findUnique({
        where: { projectId_slug: { projectId, slug: c } },
      })) !== null,
    slugBase
  );

  const env = await db.environment.create({
    data: {
      projectId,
      name: parsed.name,
      slug,
      type: parsed.type,
      status: "active",
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "environment.create",
    resourceType: "environment",
    resourceId: env.id,
    organizationId: ctx.organization.id,
    projectId,
    environmentId: env.id,
    request: req,
    metadata: { name: env.name, slug: env.slug, type: env.type },
  });

  return ok({ environment: env });
}
