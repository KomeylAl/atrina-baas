import { db } from "@/lib/db";
import { ok, err } from "@/lib/api/response";
import { logger } from "@/lib/observability/logger";

/**
 * Health check endpoint.
 *
 * - GET /api/health/live  → 200 if the process is running (liveness)
 * - GET /api/health/ready → 200 if all dependencies are reachable (readiness)
 *
 * We don't expose internal dependency details (per README section 14.3):
 *   "Do not expose detailed infrastructure information through public health endpoints."
 * Just returns { ok: true } or a generic error.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const check = url.searchParams.get("check") ?? "ready";
  const start = Date.now();

  if (check === "live") {
    return ok({ ok: true, check: "live" });
  }

  if (check === "ready") {
    try {
      // Check DB
      await db.$queryRaw`SELECT 1`;
      // We don't check Redis/storage here because they're optional in MVP.
      // If DB is up, we're "ready" to serve dashboard + API requests.
      const duration = Date.now() - start;
      logger.info("health.check.ready", { durationMs: duration, module: "health" });
      return ok({ ok: true, check: "ready", durationMs: duration });
    } catch (e) {
      logger.error("health.check.ready.failed", {
        module: "health",
        errorCode: (e as Error).name,
        errorMessage: (e as Error).message,
      });
      return err("DEPENDENCY_DOWN", "وابستگی‌ها در دسترس نیستند.", 503);
    }
  }

  return err("BAD_REQUEST", "check باید live یا ready باشد.", 400);
}
