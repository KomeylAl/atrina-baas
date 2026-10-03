export type AtrinaClientOptions = {
  /** Publishable project API key (never a server/admin secret). */
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};

export class AtrinaError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "AtrinaError";
    this.status = status;
    this.body = body;
  }
}

type Json = Record<string, unknown>;

export function createClient(options: AtrinaClientOptions) {
  if (!options.apiKey) {
    throw new Error("apiKey is required");
  }

  if (
    options.apiKey.includes("server") ||
    options.apiKey.includes("admin")
  ) {
    // Soft guard only — key kinds are prefix-based server-side; never embed server secrets in clients.
  }

  const baseUrl = (options.baseUrl ?? "http://localhost:8000/api/v1").replace(
    /\/$/,
    "",
  );
  const fetchImpl = options.fetch ?? fetch;
  let accessToken: string | null = null;

  async function request<T>(
    path: string,
    init: RequestInit = {},
    auth: "none" | "user" = "none",
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("X-Atrina-Key", options.apiKey);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (auth === "user") {
      if (!accessToken) {
        throw new AtrinaError("Not authenticated", 401, null);
      }
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const text = await response.text();
    const body = text ? safeJson(text) : null;

    if (!response.ok) {
      const message =
        typeof body === "object" &&
        body &&
        "message" in body &&
        typeof (body as Json).message === "string"
          ? String((body as Json).message)
          : `Request failed (${response.status})`;
      throw new AtrinaError(message, response.status, body);
    }

    return body as T;
  }

  const auth = {
    async signup(input: {
      email: string;
      password: string;
      password_confirmation: string;
      display_name?: string;
    }) {
      const result = await request<{ token: string; user: Json }>(
        "/project-auth/signup",
        { method: "POST", body: JSON.stringify(input) },
      );
      accessToken = result.token;
      return result;
    },
    async login(input: { email: string; password: string }) {
      const result = await request<{ token: string; user: Json }>(
        "/project-auth/login",
        { method: "POST", body: JSON.stringify(input) },
      );
      accessToken = result.token;
      return result;
    },
    async requestOtp(input: { phone: string }) {
      return request<Json>("/project-auth/otp/request", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    async verifyOtp(input: { phone: string; code: string }) {
      const result = await request<{ token: string; user: Json }>(
        "/project-auth/otp/verify",
        { method: "POST", body: JSON.stringify(input) },
      );
      accessToken = result.token;
      return result;
    },
    async google(input: { id_token: string }) {
      const result = await request<{ token: string; user: Json }>(
        "/project-auth/google",
        { method: "POST", body: JSON.stringify(input) },
      );
      accessToken = result.token;
      return result;
    },
    async me() {
      return request<{ data: Json }>("/project-auth/me", {}, "user");
    },
    async logout() {
      const result = await request<Json>(
        "/project-auth/logout",
        { method: "POST" },
        "user",
      );
      accessToken = null;
      return result;
    },
    setToken(token: string | null) {
      accessToken = token;
    },
    getToken() {
      return accessToken;
    },
  };

  const data = {
    list(table: string, query: Record<string, string | number> = {}) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        search.set(key, String(value));
      }
      const suffix = search.toString() ? `?${search}` : "";
      return request<{ data: Json[] }>(
        `/data/${encodeURIComponent(table)}${suffix}`,
        {},
        accessToken ? "user" : "none",
      );
    },
    create(table: string, attributes: Json) {
      return request<{ data: Json }>(
        `/data/${encodeURIComponent(table)}`,
        { method: "POST", body: JSON.stringify({ data: attributes }) },
        accessToken ? "user" : "none",
      );
    },
    get(table: string, recordId: string) {
      return request<{ data: Json }>(
        `/data/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`,
        {},
        accessToken ? "user" : "none",
      );
    },
    update(table: string, recordId: string, attributes: Json) {
      return request<{ data: Json }>(
        `/data/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`,
        { method: "PATCH", body: JSON.stringify({ data: attributes }) },
        accessToken ? "user" : "none",
      );
    },
    remove(table: string, recordId: string) {
      return request<Json>(
        `/data/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`,
        { method: "DELETE" },
        accessToken ? "user" : "none",
      );
    },
  };

  const billing = {
    products() {
      return request<{ data: Json[] }>("/billing/products");
    },
    plans() {
      return request<{ data: Json[] }>("/billing/plans");
    },
    verifyPurchase(input: {
      provider: string;
      store_product_id: string;
      purchase_token: string;
      idempotency_key?: string;
    }) {
      return request<Json>(
        "/billing/purchases/verify",
        { method: "POST", body: JSON.stringify(input) },
        "user",
      );
    },
    entitlements() {
      return request<{ data: Json[] }>("/billing/entitlements", {}, "user");
    },
    subscriptions() {
      return request<{ data: Json[] }>("/billing/subscriptions", {}, "user");
    },
  };

  return { auth, data, billing, request };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type AtrinaClient = ReturnType<typeof createClient>;
