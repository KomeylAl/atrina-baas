import { db } from "@/lib/db";
import { evaluateQuota } from "@/lib/quotas/decision";

export type QuotaMetric = "api_requests" | "storage_bytes" | "monthly_users" | "monthly_purchases";

export const QUOTA_METRICS: Array<{ value: QuotaMetric; label: string; unit: string; defaultLimit: number }> = [
  { value: "api_requests", label: "درخواست‌های API (ماهانه)", unit: "count", defaultLimit: 100000 },
  { value: "storage_bytes", label: "فضای ذخیره‌سازی", unit: "bytes", defaultLimit: 1024 * 1024 * 1024 }, // 1GB
  { value: "monthly_users", label: "کاربران فعال (ماهانه)", unit: "count", defaultLimit: 10000 },
  { value: "monthly_purchases", label: "خریدها (ماهانه)", unit: "count", defaultLimit: 1000 },
];

/**
 * Get the current usage for a quota metric within an environment.
 */
export async function getCurrentUsage(projectId: string, environmentId: string, metric: QuotaMetric): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  switch (metric) {
    case "api_requests": {
      const events = await db.usageEvent.findMany({
        where: { projectId, environmentId, occurredAt: { gte: startOfMonth } },
        select: { quantity: true },
      });
      return events.reduce((sum, e) => sum + e.quantity, 0);
    }
    case "storage_bytes": {
      const objects = await db.storageObject.findMany({
        where: { projectId, environmentId, status: "active" },
        select: { size: true },
      });
      return objects.reduce((sum, o) => sum + o.size, 0);
    }
    case "monthly_users": {
      return await db.projectUser.count({
        where: { projectId, environmentId, lastSignInAt: { gte: startOfMonth } },
      });
    }
    case "monthly_purchases": {
      return await db.purchase.count({
        where: { projectId, environmentId, purchasedAt: { gte: startOfMonth } },
      });
    }
  }
}

/**
 * Check if a quota allows an additional unit. Returns { allowed, current, limit, remaining }.
 */
export async function checkQuota(
  projectId: string,
  environmentId: string,
  metric: QuotaMetric
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const quota = await db.quota.findUnique({
    where: { projectId_environmentId_metric: { projectId, environmentId, metric } },
  });
  const limit = quota?.limitValue ?? QUOTA_METRICS.find((m) => m.value === metric)!.defaultLimit;
  const current = await getCurrentUsage(projectId, environmentId, metric);
  return evaluateQuota(current, limit);
}

/**
 * Record an API usage event (for quota tracking).
 */
export async function recordUsage(
  projectId: string,
  environmentId: string,
  metric: string,
  quantity: number = 1
): Promise<void> {
  try {
    await db.usageEvent.create({
      data: {
        projectId,
        environmentId,
        metric,
        quantity,
        unit: "count",
        source: "api",
        occurredAt: new Date(),
      },
    });
  } catch (err) {
    // unique constraint on idempotencyKey may fail; ignore
  }
}
