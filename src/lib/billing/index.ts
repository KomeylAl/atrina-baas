import { db } from "@/lib/db";
import { getBillingProvider } from "@/lib/billing/providers";
import type { SubscriptionStatus, Plan, ProjectUser, SubscriptionEvent } from "@prisma/client";
import { recordAudit } from "@/lib/audit";

/**
 * Apply a verified purchase to a user's subscription state, idempotently.
 *
 * Returns the resulting subscription.
 */
export async function applyVerifiedPurchase(input: {
  projectUserId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  provider: string;
  providerTransactionId?: string;
  providerPurchaseToken: string;
  providerProductId?: string;
  amount?: number;
  currency?: string;
  purchasedAt?: Date;
  rawPayload?: Record<string, unknown>;
  request?: Request;
}): Promise<{ subscriptionId: string; status: string; created: boolean }> {
  const plan = await db.plan.findUnique({
    where: { id: input.planId },
    include: { product: true },
  });
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  // Idempotency: check existing purchase with same providerTransactionId + provider
  if (input.providerTransactionId) {
    const dupCheck = await db.purchase.findFirst({
      where: { providerTransactionId: input.providerTransactionId, provider: input.provider },
      take: 1,
    });
    if (dupCheck) {
      // Already processed — return existing subscription if any
      const sub = await db.subscription.findFirst({
        where: { projectUserId: input.projectUserId, planId: input.planId, status: "active" },
      });
      return { subscriptionId: sub?.id ?? "", status: sub?.status ?? "active", created: false };
    }
  }

  // Create purchase record (verified)
  const purchase = await db.purchase.create({
    data: {
      projectId: input.projectId,
      environmentId: input.environmentId,
      projectUserId: input.projectUserId,
      provider: input.provider,
      providerTransactionId: input.providerTransactionId ?? null,
      providerPurchaseToken: input.providerPurchaseToken,
      providerProductId: input.providerProductId ?? null,
      planId: input.planId,
      status: "verified",
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      purchasedAt: input.purchasedAt ?? new Date(),
      verifiedAt: new Date(),
      rawPayload: input.rawPayload ? JSON.stringify(input.rawPayload) : null,
    },
  });

  // Compute period
  const periodStart = new Date();
  const periodEnd = computePeriodEnd(periodStart, plan.billingPeriodUnit, plan.billingPeriodCount);

  // Find or create active subscription for this user+plan
  let subscription = await db.subscription.findFirst({
    where: { projectUserId: input.projectUserId, planId: input.planId, status: "active" },
  });

  if (!subscription) {
    subscription = await db.subscription.create({
      data: {
        projectId: input.projectId,
        environmentId: input.environmentId,
        projectUserId: input.projectUserId,
        planId: input.planId,
        provider: input.provider,
        status: "active",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        providerSubscriptionId: input.providerPurchaseToken,
      },
    });
  } else {
    // Extend the period if purchase is for the same plan
    subscription = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: "active",
        providerSubscriptionId: input.providerPurchaseToken,
      },
    });
  }

  // Append event
  await db.subscriptionEvent.create({
    data: {
      subscriptionId: subscription.id,
      eventType: "purchase.verified",
      source: input.provider,
      idempotencyKey: input.providerTransactionId ?? input.providerPurchaseToken,
      payloadRedacted: JSON.stringify({ purchaseId: purchase.id, planId: input.planId }),
      processedAt: new Date(),
    },
  });

  if (input.request) {
    await recordAudit({
      actorType: "api_credential",
      action: "purchase.verified",
      resourceType: "purchase",
      resourceId: purchase.id,
      projectId: input.projectId,
      environmentId: input.environmentId,
      request: input.request,
      metadata: { provider: input.provider, planId: input.planId },
    });
  }

  return { subscriptionId: subscription.id, status: subscription.status, created: true };
}

/**
 * Compute the end of a billing period.
 * A month is not always 30 days — we use calendar arithmetic.
 */
export function computePeriodEnd(start: Date, unit: string, count: number): Date {
  const end = new Date(start);
  switch (unit) {
    case "day":
      end.setDate(end.getDate() + count);
      break;
    case "week":
      end.setDate(end.getDate() + count * 7);
      break;
    case "month":
      end.setMonth(end.getMonth() + count);
      break;
    case "year":
      end.setFullYear(end.getFullYear() + count);
      break;
    default:
      // fallback: 30 days
      end.setDate(end.getDate() + 30 * count);
  }
  return end;
}

/**
 * Resolve a user's effective entitlements based on their active subscriptions.
 */
export async function resolveEntitlements(projectUserId: string): Promise<Array<{ code: string; name: string; value: unknown }>> {
  const subs = await db.subscription.findMany({
    where: { projectUserId, status: "active", currentPeriodEnd: { gte: new Date() } },
    include: {
      plan: {
        include: {
          planEntitlements: {
            include: { entitlement: true },
          },
        },
      },
    },
  });
  const result: Array<{ code: string; name: string; value: unknown }> = [];
  const seen = new Set<string>();
  for (const s of subs) {
    for (const pe of s.plan.planEntitlements) {
      if (seen.has(pe.entitlement.code)) continue;
      seen.add(pe.entitlement.code);
      let value: unknown = true;
      try {
        value = JSON.parse(pe.value);
      } catch {
        value = pe.value;
      }
      result.push({ code: pe.entitlement.code, name: pe.entitlement.name, value });
    }
  }
  return result;
}
