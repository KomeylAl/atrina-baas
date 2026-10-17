import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";

export async function GET() {
  const user = await requireUser();

  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id, status: "active", organization: { status: "active" } },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);

  const [orgs, projects, environments, credentials, auditLogs] = await Promise.all([
    db.organization.count({ where: { id: { in: orgIds } } }),
    db.project.count({ where: { organizationId: { in: orgIds }, deletedAt: null } }),
    db.environment.count({
      where: { project: { organizationId: { in: orgIds }, deletedAt: null } },
    }),
    db.apiCredential.count({
      where: { environment: { project: { organizationId: { in: orgIds } } }, status: "active" },
    }),
    db.auditLog.count({
      where: { organizationId: { in: orgIds }, actorType: "platform_user" },
    }),
  ]);

  const recentLogs = await db.auditLog.findMany({
    where: { organizationId: { in: orgIds } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { actor: { select: { email: true, displayName: true } } },
  });

  return ok({
    user,
    stats: { orgs, projects, environments, credentials, auditLogs },
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      action: l.action,
      resourceType: l.resourceType,
      actorEmail: l.actor?.email ?? "system",
      createdAt: l.createdAt,
    })),
  });
}
