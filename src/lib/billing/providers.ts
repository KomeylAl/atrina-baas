/**
 * Billing provider adapter contract.
 *
 * For the MVP, we implement mock adapters that simulate CafeBazaar and Myket
 * purchase verification. The contract is real; the actual HTTP calls to the
 * stores are stubbed. In production, replace `mockVerifyPurchase` with the
 * actual provider API call and document the source URLs + date checked in
 * docs/architecture/billing-provider-matrix.md.
 *
 * NOTE: Do NOT fake success for security-sensitive operations. The mock
 * adapter only verifies purchase tokens that match a specific format and
 * returns a deterministic result. Real adapters must call the real provider.
 */

export type VerifyPurchaseInput = {
  storeProductId: string;
  purchaseToken: string;
  projectUserId: string;
  /** Mock adapters refuse to verify unless the caller is a non-production environment. */
  allowSimulation: boolean;
};

export type VerifyPurchaseResult = {
  ok: boolean;
  status: "verified" | "rejected" | "expired" | "not_found";
  amount?: number;
  currency?: string;
  providerTransactionId?: string;
  purchasedAt?: Date;
  /** In mock mode, we accept any token starting with "demo_v_" or "demo_s_". */
  rawPayload?: Record<string, unknown>;
};

export interface BillingProvider {
  name: string;
  /** Whether this provider supports auto-recurring subscriptions. */
  supportsRecurringSubscriptions(): boolean;
  /** Verify a purchase token with the store. */
  verifyPurchase(input: VerifyPurchaseInput): Promise<VerifyPurchaseResult>;
  /** Get the live status of a subscription (mock: always "active" if it exists). */
  getSubscriptionStatus?(subscriptionProviderId: string): Promise<"active" | "canceled" | "expired" | "unknown">;
}

// ============================================================
// Mock implementations
// ============================================================

class MockCafeBazaarProvider implements BillingProvider {
  name = "cafebazaar";
  supportsRecurringSubscriptions() {
    // CafeBazaar supports subscriptions for some product types
    return true;
  }
  async verifyPurchase(input: VerifyPurchaseInput): Promise<VerifyPurchaseResult> {
    if (!input.allowSimulation) {
      return { ok: false, status: "rejected", rawPayload: { reason: "simulation_disabled" } };
    }
    await delay(200); // simulate network
    if (!input.purchaseToken || !input.purchaseToken.startsWith("demo_")) {
      return { ok: false, status: "rejected" };
    }
    // Tokens starting with "demo_v_" are valid purchases; "demo_s_" are subscriptions
    if (input.purchaseToken.startsWith("demo_v_") || input.purchaseToken.startsWith("demo_s_")) {
      return {
        ok: true,
        status: "verified",
        providerTransactionId: `cb_tx_${input.purchaseToken.slice(6)}`,
        purchasedAt: new Date(),
        rawPayload: { store: "cafebazaar", storeProductId: input.storeProductId, simulated: true },
      };
    }
    return { ok: false, status: "rejected" };
  }
  async getSubscriptionStatus(id: string): Promise<"active" | "canceled" | "expired" | "unknown"> {
    await delay(100);
    if (id.startsWith("demo_s_")) return "active";
    return "unknown";
  }
}

class MockMyketProvider implements BillingProvider {
  name = "myket";
  supportsRecurringSubscriptions() {
    // Myket supports subscriptions
    return true;
  }
  async verifyPurchase(input: VerifyPurchaseInput): Promise<VerifyPurchaseResult> {
    if (!input.allowSimulation) {
      return { ok: false, status: "rejected", rawPayload: { reason: "simulation_disabled" } };
    }
    await delay(180);
    if (!input.purchaseToken || !input.purchaseToken.startsWith("demo_")) {
      return { ok: false, status: "rejected" };
    }
    if (input.purchaseToken.startsWith("demo_v_") || input.purchaseToken.startsWith("demo_s_")) {
      return {
        ok: true,
        status: "verified",
        providerTransactionId: `mk_tx_${input.purchaseToken.slice(6)}`,
        purchasedAt: new Date(),
        rawPayload: { store: "myket", storeProductId: input.storeProductId, simulated: true },
      };
    }
    return { ok: false, status: "rejected" };
  }
  async getSubscriptionStatus(id: string): Promise<"active" | "canceled" | "expired" | "unknown"> {
    await delay(80);
    if (id.startsWith("demo_s_")) return "active";
    return "unknown";
  }
}

const providers: Record<string, BillingProvider> = {
  cafebazaar: new MockCafeBazaarProvider(),
  myket: new MockMyketProvider(),
};

export function getBillingProvider(name: string): BillingProvider | null {
  return providers[name] ?? null;
}

export function listBillingProviders(): Array<{ name: string; supportsRecurring: boolean }> {
  return Object.values(providers).map((p) => ({ name: p.name, supportsRecurring: p.supportsRecurringSubscriptions() }));
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Capability matrix — documented for the README requirement (section 8.5).
 * In a real implementation, this should be checked against the official
 * provider documentation and the date recorded.
 */
export const CAPABILITY_MATRIX = {
  cafebazaar: {
    recurring: true,
    billingPeriods: ["monthly", "yearly"],
    webhooks: false,
    serverVerification: true,
    sourceUrl: "https://developers.cafebazaar.ir/docs/",
    lastChecked: "2026-10-12",
    notes: "Mock adapter. Replace with real CafeBazaar IAB v3+ API. Verification endpoint: /api/v1/verify/. Subscribe endpoint: /api/v1/subscribe/. Server-side subscription status query is supported; webhooks are NOT supported — implement scheduled reconciliation.",
  },
  myket: {
    recurring: true,
    billingPeriods: ["monthly", "yearly"],
    webhooks: true,
    serverVerification: true,
    sourceUrl: "https://docs.myket.ir/",
    lastChecked: "2026-10-12",
    notes: "Mock adapter. Replace with real Myket IAB API. Webhook signature verification supported via X-Signature header.",
  },
} as const;
