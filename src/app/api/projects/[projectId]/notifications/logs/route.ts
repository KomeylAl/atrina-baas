import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { err, ok } from "@/lib/api/response";

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

  const logs = await db.notificationLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({
    logs: logs.map((l) => ({
      id: l.id,
      channel: l.channel,
      provider: l.provider,
      templateCode: l.templateCode,
      recipient: l.recipient,
      status: l.status,
      attempts: l.attempts,
      errorMessage: l.errorMessage,
      createdAt: l.createdAt,
      sentAt: l.sentAt,
    })),
  });
}
