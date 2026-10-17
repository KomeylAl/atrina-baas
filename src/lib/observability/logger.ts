/**
 * Structured JSON logger for production observability.
 *
 * Emits one JSON line per log call to stdout/stderr. Each line includes:
 * - timestamp (ISO 8601 UTC)
 * - severity (debug|info|warn|error)
 * - service / module name
 * - requestId (if available)
 * - projectId / environmentId (if available, only if not sensitive)
 * - errorCode (optional)
 * - durationMs (optional)
 * - message
 * - structured context (any other fields)
 *
 * Sensitive fields are automatically redacted via the same list used by audit.ts.
 *
 * In production, pipe stdout to your log aggregator (e.g. Loki, CloudWatch,
 * Elasticsearch). The JSON format is compatible with most log collectors.
 */

type Severity = "debug" | "info" | "warn" | "error";

type LogContext = {
  requestId?: string;
  projectId?: string;
  environmentId?: string;
  errorCode?: string;
  durationMs?: number;
  module?: string;
  [key: string]: unknown;
};

const SENSITIVE_KEYS = [
  "password", "passwordhash", "token", "tokenhash", "secret", "apikey",
  "secrethash", "authorization", "cookie", "otp", "code", "refreshtoken",
  "purchasetoken", "signingsecret", "configurationenc",
];

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const keyLower = k.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => keyLower.includes(s))) {
      result[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      result[k] = redact(v);
    } else if (typeof v === "string" && v.length > 1024) {
      result[k] = v.slice(0, 1024) + "…[truncated]";
    } else {
      result[k] = v;
    }
  }
  return result;
}

function log(severity: Severity, message: string, context: LogContext = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    severity,
    service: context.module ?? "atrina-baas",
    message,
    ...redactContext(context),
  };
  const line = JSON.stringify(entry);
  if (severity === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

function redactContext(context: LogContext): Record<string, unknown> {
  const redacted = redact(context);
  return (redacted ?? {}) as Record<string, unknown>;
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};

/**
 * Wrap an async function with timing + error logging.
 */
export async function withLogging<T>(
  name: string,
  fn: () => Promise<T>,
  context: LogContext = {}
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logger.info(name, { ...context, durationMs: Date.now() - start });
    return result;
  } catch (err) {
    logger.error(`${name} failed`, {
      ...context,
      durationMs: Date.now() - start,
      errorCode: (err as Error).name,
      errorMessage: (err as Error).message,
    });
    throw err;
  }
}
