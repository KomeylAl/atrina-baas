import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { err, ok } from "@/lib/api/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  // Aggregate usage events per metric in last 30 days
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const events = await db.usageEvent.findMany({
    where: { projectId, occurredAt: { gte: since } },
    select: { metric: true, quantity: true, environmentId: true, occurredAt: true },
  });

  // Group by metric + day bucket (YYYY-MM-DD)
  const byMetric: Record<string, number> = {};
  const byDay: Record<string, Record<string, number>> = {};
  for (const e of events) {
    byMetric[e.metric] = (byMetric[e.metric] ?? 0) + e.quantity;
    const day = e.occurredAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = {};
    byDay[day][e.metric] = (byDay[day][e.metric] ?? 0) + e.quantity;
  }

  return ok({
    totalEvents: events.length,
    byMetric,
    byDay,
  });
}
