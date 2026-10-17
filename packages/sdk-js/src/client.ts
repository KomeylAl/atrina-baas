/**
 * Atrina BaaS — Base HTTP client
 *
 * Handles:
 * - Authentication via x-atrina-key header (publishable/server/admin)
 * - User session via Authorization: Bearer header
 * - JSON request/response serialization
 * - Error normalization (throws AtrinaError on non-2xx)
 * - Retries on 5xx with exponential backoff
 */

import { AtrinaError } from "./types";

export type ClientConfig = {
  baseUrl: string;       // e.g. "https://api.atrina.io/api/v1"
  apiKey: string;        // publishable or server_secret key (atr_pk_... or atr_sk_...)
  userToken?: string | null; // session token (from login/signup)
  timeoutMs?: number;    // default: 30000
  retries?: number;      // default: 2
};

export class HttpClient {
  private config: Required<ClientConfig>;

  constructor(config: ClientConfig) {
    this.config = {
      timeoutMs: 30_000,
      retries: 2,
      userToken: null,
      ...config,
    };
  }

  /** Update the user token (e.g. after login). */
  setUserToken(token: string | null) {
    this.config.userToken = token;
  }

  /** Get the current user token. */
  getUserToken(): string | null {
    return this.config.userToken;
  }

  /** GET request. */
  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>("GET", path, undefined, query);
  }

  /** POST request. */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  /** PATCH request. */
  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  /** DELETE request. */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  /** Upload a file (multipart/form-data). */
  async upload<T>(path: string, file: File | Blob, fileName?: string): Promise<T> {
    const url = this.buildUrl(path);
    const formData = new FormData();
    formData.append("file", file, fileName);

    const headers: Record<string, string> = {
      "x-atrina-key": this.config.apiKey,
    };
    if (this.config.userToken) {
      headers["Authorization"] = `Bearer ${this.config.userToken}`;
    }

    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: formData,
    });
    return this.handleResponse<T>(res);
  }

  /** Build a full URL with optional query params. */
  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  /** Core request method with retries. */
  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = this.buildUrl(path, query);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-atrina-key": this.config.apiKey,
    };
    if (this.config.userToken) {
      headers["Authorization"] = `Bearer ${this.config.userToken}`;
    }

    let lastError: AtrinaError | null = null;
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const res = await this.fetchWithTimeout(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        // Retry on 5xx
        if (res.status >= 500 && attempt < this.config.retries) {
          await this.backoff(attempt);
          continue;
        }
        return this.handleResponse<T>(res);
      } catch (err) {
        if (err instanceof AtrinaError) {
          // Don't retry on 4xx
          if (err.status < 500) throw err;
          lastError = err;
        } else {
          // Network error
          lastError = new AtrinaError("NETWORK_ERROR", (err as Error).message, 0);
        }
        if (attempt < this.config.retries) {
          await this.backoff(attempt);
        }
      }
    }
    throw lastError ?? new AtrinaError("UNKNOWN", "Unknown error", 0);
  }

  /** Fetch with timeout via AbortController. */
  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Parse response and throw AtrinaError on non-2xx. */
  private async handleResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    if (!res.ok) {
      const errObj = (json as { error?: { code: string; message: string } }) | null;
      const code = errObj?.error?.code ?? "HTTP_ERROR";
      const message = errObj?.error?.message ?? `HTTP ${res.status}`;
      throw new AtrinaError(code, message, res.status, json);
    }
    // All API responses are wrapped in { ok, data }
    const wrapped = json as { ok: boolean; data?: T; error?: { code: string; message: string } };
    return (wrapped.data ?? wrapped) as T;
  }

  /** Exponential backoff: 500ms, 1000ms, 2000ms, ... */
  private backoff(attempt: number): Promise<void> {
    const delay = 500 * Math.pow(2, attempt);
    return new Promise((r) => setTimeout(r, delay));
  }
}
