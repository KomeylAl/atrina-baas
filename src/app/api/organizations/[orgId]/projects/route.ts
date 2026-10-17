import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, getCurrentUser } from "@/lib/auth/session";
import { resolveOrgForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { recordAudit } from "@/lib/audit";
import { err, ok } from "@/lib/api/response";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import { z } from "zod";

// List projects for an organization
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const user = await requireUser();
  const { orgId } = await params;
  const ctx = await resolveOrgForUser(user, orgId);
  if (!ctx) return err("FORBIDDEN", "دسترسی به این سازمان ندارید.", 403);

  const projects = await db.project.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      environments: { select: { id: true, name: true, slug: true, type: true, status: true } },
      _count: { select: { environments: true, auditLogs: true, usageEvents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      status: p.status,
      createdAt: p.createdAt,
      environments: p.environments,
      credentialsCount: 0, // credentials are scoped per env, not project — computed on detail view
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).optional(),
  description: z.string().max(280).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const user = await requireUser();
  const { orgId } = await params;
  const ctx = await resolveOrgForUser(user, orgId);
  if (!ctx) return err("FORBIDDEN", "دسترسی به این سازمان ندارید.", 403);
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
      (await db.project.findUnique({
        where: { organizationId_slug: { organizationId: orgId, slug: c } },
      })) !== null,
    slugBase
  );

  const project = await db.project.create({
    data: {
      organizationId: orgId,
      name: parsed.name,
      slug,
      description: parsed.description ?? null,
      status: "active",
      createdById: user.id,
    },
  });

  // Default environments: development + production
  await db.environment.createMany({
    data: [
      { projectId: project.id, name: "Development", slug: "development", type: "development", status: "active" },
      { projectId: project.id, name: "Production", slug: "production", type: "production", status: "active" },
    ],
  });

  await recordAudit({
    actorId: user.id,
    action: "project.create",
    resourceType: "project",
    resourceId: project.id,
    organizationId: orgId,
    projectId: project.id,
    request: req,
    metadata: { name: project.name, slug: project.slug },
  });

  return ok({ project });
}
