/**
 * Tiny helpers for API routes — return JSON responses with consistent envelopes.
 */
export function ok<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

export function err(
  code: string,
  message: string,
  status = 400,
  extra?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({ ok: false, error: { code, message, ...extra } }),
    {
      status,
      headers: { "content-type": "application/json" },
    }
  );
}

export type ApiError = { code: string; message: string };
