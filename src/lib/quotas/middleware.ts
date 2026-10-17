import { db } from "@/lib/db";
import { checkQuota, recordUsage, type QuotaMetric } from "@/lib/quotas";
import type { DataPlaneContext } from "@/lib/auth/project/data-plane";

/**
 * Enforce quota for a given metric. If the quota is exceeded, return an error
 * response object that the route can return directly. Otherwise, record usage
 * and return null (caller should continue normally).
 *
 * Usage in a data-plane route:
 * ```ts
 * const quotaErr = await enforceQuota(ctx, "api_requests");
 * if (quotaErr) return quotaErr;
 * ```
 *
 * Note: We use a small "soft check" — we don't decrement the remaining quota
 * atomically. This is acceptable because:
 * 1. Usage is tracked via usage_events which is append-only.
 * 2. The check is re-evaluated on every request.
 * 3. A small race window is acceptable for most BaaS use cases.
 *
 * For stricter enforcement, use a Redis-backed atomic counter (future enhancement).
 */
export async function enforceQuota(
  ctx: DataPlaneContext,
  metric: QuotaMetric,
  incrementBy: number = 1
): Promise<Response | null> {
  const check = await checkQuota(ctx.project.id, ctx.environment.id, metric);
  if (!check.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "QUOTA_EXCEEDED",
          message: `سهمیه ${metric} پر شده است. استفاده فعلی: ${check.current} از ${check.limit}`,
          metric,
          current: check.current,
          limit: check.limit,
        },
      }),
      {
        status: 429,
        headers: { "content-type": "application/json" },
      }
    );
  }
  // Record usage (async, non-blocking)
  void recordUsage(ctx.project.id, ctx.environment.id, metric, incrementBy).catch(() => undefined);
  return null;
}

/**
 * Get usage stats for a specific environment. Used by middleware to decide
 * if a request should be allowed based on multiple metrics at once.
 */
export async function checkMultipleQuotas(
  ctx: DataPlaneContext,
  metrics: QuotaMetric[]
): Promise<{ allowed: boolean; failed?: { metric: QuotaMetric; current: number; limit: number } }> {
  for (const m of metrics) {
    const c = await checkQuota(ctx.project.id, ctx.environment.id, m);
    if (!c.allowed) {
      return { allowed: false, failed: { metric: m, current: c.current, limit: c.limit } };
    }
  }
  return { allowed: true };
}
