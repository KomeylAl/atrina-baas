export function evaluateQuota(current: number, limit: number): {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
} {
  const safeCurrent = Number.isFinite(current) ? current : Number.POSITIVE_INFINITY;
  const safeLimit = Number.isFinite(limit) ? limit : 0;
  const remaining = Math.max(0, safeLimit - safeCurrent);
  return {
    allowed: safeCurrent < safeLimit,
    current: safeCurrent,
    limit: safeLimit,
    remaining,
  };
}
