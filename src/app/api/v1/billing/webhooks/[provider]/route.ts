import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveDataPlaneContext } from "@/lib/auth/project/data-plane";
import { getBillingProvider } from "@/lib/billing/providers";
import { environmentAllowsStoreSimulation } from "@/lib/billing/sandbox";
import { err, ok } from "@/lib/api/response";

/**
 * Inbound webhook endpoint for billing providers.
 * Mock: we accept any payload and process it idempotently.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const body = await req.text();
  const { ctx } = await resolveDataPlaneContext();
  if (!ctx) return err("UNAUTHORIZED", "کلید API نامعتبر.", 401);

  const billingProvider = getBillingProvider(provider);
  if (!billingProvider) return err("UNSUPPORTED_PROVIDER", "پشتیبان نشده.", 400);
  if (!environmentAllowsStoreSimulation(ctx.environment.type)) {
    return err(
      "STORE_SIMULATION_DISABLED",
      "وب‌هوک آزمایشی فروشگاه در محیط تولید پذیرفته نمی‌شود.",
      403
    );
  }

  // Mock: parse webhook payload as JSON
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return err("INVALID_PAYLOAD", "Payload نامعتبر.", 400);
  }

  // Mock processing: in a real impl, verify signature, extract event type,
  // apply idempotently to subscription state.
  return ok({
    received: true,
    provider,
    mock: true,
    payloadKeys: Object.keys(payload),
  });
}
