/**
 * Atrina BaaS — JavaScript/TypeScript SDK
 *
 * @packageDocumentation
 *
 * Quick start:
 *
 * ```ts
 * import { Atrina } from "@atrina/baas-sdk";
 *
 * const atrina = new Atrina({
 *   baseUrl: "https://api.atrina.io/api/v1",
 *   apiKey: "atr_pk_production_...",  // publishable key from dashboard
 * });
 *
 * // Signup
 * const { user, token } = await atrina.auth.signup({
 *   email: "alice@example.com",
 *   password: "secret123",
 *   displayName: "Alice",
 * });
 *
 * // Work with data
 * const posts = atrina.data.table<{ title: string; body: string }>("posts");
 * const list = await posts.list({ page: 1, pageSize: 10 });
 * const post = await posts.create({ title: "Hello", body: "World" });
 *
 * // Verify a purchase
 * const result = await atrina.billing.verifyPurchase({
 *   planId: "...",
 *   purchaseToken: "...",
 *   storeProductId: "...",
 *   provider: "cafebazaar",
 * });
 * ```
 */

export { HttpClient } from "./client";
export { Auth } from "./auth";
export { Data, Table } from "./data";
export { Billing } from "./billing";
export { Storage } from "./storage";
export * from "./types";

export type AtrinaConfig = {
  baseUrl: string;
  apiKey: string;
  userToken?: string | null;
  timeoutMs?: number;
  retries?: number;
};

export class Atrina {
  readonly client: HttpClient;
  readonly auth: Auth;
  readonly data: Data;
  readonly billing: Billing;
  readonly storage: Storage;

  constructor(config: AtrinaConfig) {
    this.client = new HttpClient(config);
    this.auth = new Auth(this.client);
    this.data = new Data(this.client);
    this.billing = new Billing(this.client);
    this.storage = new Storage(this.client);
  }

  /** Set/replace the user token (e.g. after restoring from localStorage). */
  setUserToken(token: string | null): void {
    this.client.setUserToken(token);
  }

  /** Get the current user token (for persisting to localStorage). */
  getUserToken(): string | null {
    return this.client.getUserToken();
  }
}

export default Atrina;
