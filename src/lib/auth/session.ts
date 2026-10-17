import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { safeCompare, hashSecret } from "@/lib/security/crypto";
import type { PlatformUser, UserSession, OrganizationMember, Organization } from "@prisma/client";

const SESSION_COOKIE = "atrina_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function sessionCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export type SessionUser = Pick<
  PlatformUser,
  "id" | "email" | "displayName" | "status"
> & {
  memberships: Array<
    Pick<OrganizationMember, "id" | "role" | "status"> & {
      organization: Pick<Organization, "id" | "name" | "slug" | "status">;
    }
  >;
};

/**
 * Get the current logged-in platform user, or null.
 * Server-side only — reads cookie, validates session against DB.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashSecret(token);
  const session = await db.userSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          organizationMembers: {
            include: {
              organization: {
                select: { id: true, name: true, slug: true, status: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) return null;
  if (session.user.status !== "active") return null;

  // Bump lastUsedAt in background (non-blocking)
  void db.userSession
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    memberships: user.organizationMembers.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      organization: m.organization,
    })),
  };
}

/**
 * Get the current user, throwing 401 if not authenticated.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}

/**
 * Create a session + set cookie. Returns the user.
 */
export async function createSession(
  userId: string,
  request?: Request
): Promise<string> {
  const token = (await import("@/lib/security/crypto")).generateSessionToken();
  const tokenHash = hashSecret(token);
  const userAgent = request?.headers.get("user-agent") ?? undefined;
  const forwardedFor = request?.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || undefined;

  await db.userSession.create({
    data: {
      userId,
      tokenHash,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  await db.platformUser.update({
    where: { id: userId },
    data: { lastSignInAt: new Date() },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return token;
}

/**
 * Revoke the current session and clear the cookie.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashSecret(token);
    await db.userSession
      .updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE };
