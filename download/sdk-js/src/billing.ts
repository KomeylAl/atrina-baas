/**
 * Atrina BaaS — Billing module
 *
 * Wraps the /billing/* endpoints.
 */

import { HttpClient } from "./client";
import type {
  Entitlement,
  Plan,
  Product,
  Subscription,
  VerifyPurchaseResult,
} from "./types";

export type VerifyPurchaseInput = {
  planId: string;
  purchaseToken: string;
  storeProductId: string;
  provider: "cafebazaar" | "myket";
};

export class Billing {
  constructor(private client: HttpClient) {}

  /** List all products (with their plans and entitlements). */
  async products(): Promise<Product[]> {
    const res = await this.client.get<{ products: Product[] }>("/billing/products");
    return res.products;
  }

  /** Find a plan by code (helper). */
  async findPlan(planCode: string): Promise<Plan | null> {
    const products = await this.products();
    for (const p of products) {
      const plan = p.plans.find((pl) => pl.code === planCode);
      if (plan) return plan;
    }
    return null;
  }

  /** Verify a purchase with the store and create/update subscription. */
  async verifyPurchase(input: VerifyPurchaseInput): Promise<VerifyPurchaseResult> {
    return this.client.post<VerifyPurchaseResult>("/billing/purchases/verify", input);
  }

  /** Get the current user's subscriptions. */
  async subscriptions(): Promise<Subscription[]> {
    const res = await this.client.get<{ subscriptions: Subscription[] }>("/billing/subscriptions");
    return res.subscriptions;
  }

  /** Get the current user's active entitlements. */
  async entitlements(): Promise<Entitlement[]> {
    const res = await this.client.get<{ entitlements: Entitlement[] }>("/billing/subscriptions");
    return res.entitlements ?? [];
  }

  /** Check if a specific entitlement is active. */
  async hasEntitlement(code: string): Promise<boolean> {
    const ents = await this.entitlements();
    const e = ents.find((x) => x.code === code);
    return e ? Boolean(e.value) : false;
  }
}
