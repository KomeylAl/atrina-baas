import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveDataPlaneContext, resolveProjectUser } from "@/lib/auth/project/data-plane";
import { getBillingProvider } from "@/lib/billing/providers";
import { environmentAllowsStoreSimulation } from "@/lib/billing/sandbox";
import { applyVerifiedPurchase, computePeriodEnd } from "@/lib/billing";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

const schema = z.object({
  planId: z.string().min(1),
  purchaseToken: z.string().min(1).max(512),
  storeProductId: z.string().min(1).max(128),
  provider: z.enum(["cafebazaar", "myket"]),
});

// POST /api/v1/billing/purchases/verify
export async function POST(req: NextRequest) {
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);

  const { user } = await resolveProjectUser(ctx);
  if (!user) return err("UNAUTHORIZED", "نشست کاربر نامعتبر.", 401);

  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  // Resolve plan + ensure it belongs to this project
  const plan = await db.plan.findUnique({
    where: { id: parsed.planId },
    include: { product: true },
  });
  if (!plan || plan.product.projectId !== ctx.project.id) {
    return err("NOT_FOUND", "طرح یافت نشد.", 404);
  }

  const provider = getBillingProvider(parsed.provider);
  if (!provider) return err("UNSUPPORTED_PROVIDER", "پشتیبان نشده.", 400);

  const allowSimulation = environmentAllowsStoreSimulation(ctx.environment.type);
  if (!allowSimulation) {
    return err(
      "STORE_SIMULATION_DISABLED",
      "تأیید آزمایشی فروشگاه فقط در محیط توسعه یا پیش‌تولید فعال است.",
      403
    );
  }

  const verification = await provider.verifyPurchase({
    storeProductId: parsed.storeProductId,
    purchaseToken: parsed.purchaseToken,
    projectUserId: user.id,
    allowSimulation,
  });

  if (!verification.ok) {
    // Record rejected purchase attempt for audit
    await db.purchase.create({
      data: {
        projectId: ctx.project.id,
        environmentId: ctx.environment.id,
        projectUserId: user.id,
        provider: parsed.provider,
        providerPurchaseToken: parsed.purchaseToken,
        providerProductId: parsed.storeProductId,
        planId: plan.id,
        status: "rejected",
        rawPayload: verification.rawPayload ? JSON.stringify(verification.rawPayload) : null,
      },
    }).catch(() => undefined);
    return err("PURCHASE_REJECTED", "خرید توسط فروشگاه رد شد.", 422);
  }

  const result = await applyVerifiedPurchase({
    projectUserId: user.id,
    projectId: ctx.project.id,
    environmentId: ctx.environment.id,
    planId: plan.id,
    provider: parsed.provider,
    providerTransactionId: verification.providerTransactionId,
    providerPurchaseToken: parsed.purchaseToken,
    providerProductId: parsed.storeProductId,
    amount: verification.amount,
    currency: verification.currency,
    purchasedAt: verification.purchasedAt,
    rawPayload: verification.rawPayload,
    request: req,
  });

  return ok({
    ok: true,
    status: result.status,
    subscriptionId: result.subscriptionId,
    planCode: plan.code,
    periodEnd: await getSubscriptionPeriodEnd(result.subscriptionId),
  });
}

async function getSubscriptionPeriodEnd(subId: string) {
  const sub = await db.subscription.findUnique({ where: { id: subId } });
  return sub?.currentPeriodEnd ?? null;
}
