import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Check whether the user has at least one of the given roles in any organization.
 * `owner` and `admin` always pass for their organization's projects.
 */
export type OrgRole = "owner" | "admin" | "developer" | "billing" | "viewer";

export function hasOrgRole(
  user: SessionUser,
  orgId: string,
  roles: OrgRole[]
): boolean {
  const membership = user.memberships.find(
    (m) => m.organization.id === orgId && m.status === "active"
  );
  if (!membership) return false;
  return roles.includes(membership.role as OrgRole);
}

/**
 * Resolve the active organization context (used when no specific org is selected).
 * Returns the first active membership, or null if none.
 */
export function primaryOrg(user: SessionUser) {
  const membership = user.memberships.find((m) => m.status === "active");
  return membership?.organization ?? null;
}

/**
 * Resolve organization by id, ensuring the user is a member.
 */
export async function resolveOrgForUser(
  user: SessionUser,
  orgId: string
) {
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || org.status === "deleted") return null;
  const membership = user.memberships.find(
    (m) => m.organization.id === orgId && m.status === "active"
  );
  if (!membership) return null;
  return { org, role: membership.role as OrgRole };
}

/**
 * Resolve project by id, ensuring user can access it (via organization membership).
 */
export async function resolveProjectForUser(
  user: SessionUser,
  projectId: string
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { organization: true },
  });
  if (!project || project.deletedAt) return null;
  const membership = user.memberships.find(
    (m) => m.organization.id === project.organizationId && m.status === "active"
  );
  if (!membership) return null;
  return {
    project,
    organization: project.organization,
    role: membership.role as OrgRole,
  };
}
