import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { hashSecret, generateSessionToken } from "@/lib/security/crypto";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const url = new URL(req.url);
  const envId = url.searchParams.get("envId");
  const where: Record<string, unknown> = {};
  if (envId) where.environmentId = envId;
  else where.environment = { projectId };

  const endpoints = await db.webhookEndpoint.findMany({
    where,
    include: {
      environment: { select: { id: true, name: true } },
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok({
    endpoints: endpoints.map((e) => ({
      id: e.id,
      url: e.url,
      events: JSON.parse(e.events),
      status: e.status,
      environment: e.environment,
      deliveriesCount: e._count.deliveries,
      signingSecretPrefix: e.signingSecret.slice(0, 8) + "••••",
      createdAt: e.createdAt,
    })),
  });
}

const createSchema = z.object({
  environmentId: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string()).min(1).max(20),
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
  // Basic SSRF protection: block obvious internal IPs
  const u = new URL(parsed.url);
  if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname.startsWith("192.168.") || u.hostname.startsWith("10.") || u.hostname.startsWith("169.254.")) {
    return err("SSRF_BLOCKED", "آدرس داخلی مجاز نیست.", 400);
  }

  const signingSecret = generateSessionToken(32);
  const endpoint = await db.webhookEndpoint.create({
    data: {
      projectId,
      environmentId: parsed.environmentId,
      url: parsed.url,
      events: JSON.stringify(parsed.events),
      // Note: We store the signing secret in PLAINTEXT (not hashed) because
      // we need to use it for HMAC-SHA256 signing on every webhook delivery.
      // The secret is generated with cryptographically secure random bytes
      // and is only ever sent over HTTPS to the recipient (who also has it).
      signingSecret,
      status: "active",
    },
  });

  // Return the raw secret ONCE
  return ok({
    endpoint: { id: endpoint.id, url: endpoint.url, events: parsed.events, status: endpoint.status },
    signingSecret,
    warning: "این signing secret فقط یک بار نمایش داده می‌شود.",
  });
}
