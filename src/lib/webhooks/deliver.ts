import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

/**
 * Real outbound webhook delivery.
 *
 * For each endpoint matching the event, we:
 * 1. Build the payload
 * 2. Sign it with the endpoint's signing secret (HMAC-SHA256)
 * 3. POST to the endpoint URL with timeout + retry
 * 4. Record a WebhookDelivery with the result
 *
 * Per the README (section 13.2), outbound webhooks need:
 * - Per-project endpoint + event subscriptions
 * - Signing secret with rotation
 * - Timestamp and signature headers
 * - Retry policy with backoff
 * - Delivery history and manual replay
 * - SSRF protection and destination validation
 */

const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1_000, 5_000, 30_000]; // 1s, 5s, 30s

type DeliveryResult = {
  status: "delivered" | "failed";
  responseCode?: number;
  errorMessage?: string;
  attempts: number;
};

/**
 * Sign a payload with HMAC-SHA256. Returns hex signature.
 * Format: t=<timestamp>,s=<signature>
 */
export function signPayload(secret: string, payload: string, timestamp: number): string {
  const signedMessage = `${timestamp}.${payload}`;
  return createHmac("sha256", secret).update(signedMessage).digest("hex");
}

/**
 * Deliver a webhook event to all matching endpoints in a project + environment.
 * Returns the number of delivery attempts made.
 */
export async function deliverWebhookEvent(input: {
  projectId: string;
  environmentId: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<number> {
  // Find all active endpoints in this env that subscribe to this event
  const endpoints = await db.webhookEndpoint.findMany({
    where: {
      projectId: input.projectId,
      environmentId: input.environmentId,
      status: "active",
    },
  });

  const matching = endpoints.filter((e) => {
    try {
      const events = JSON.parse(e.events) as string[];
      // Support wildcard "*" subscription
      return events.includes(input.eventType) || events.includes("*");
    } catch {
      return false;
    }
  });

  let count = 0;
  for (const endpoint of matching) {
    // Create delivery record first (pending), then attempt
    const delivery = await db.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventType: input.eventType,
        payload: JSON.stringify(input.payload),
        status: "pending",
        attempts: 0,
      },
    });

    // Attempt delivery asynchronously (don't block the request)
    void attemptDelivery(delivery.id, endpoint.id, input.eventType, input.payload).catch((err) => {
      logger.error("webhook.delivery.async_failed", {
        module: "webhooks",
        deliveryId: delivery.id,
        errorMessage: (err as Error).message,
      });
    });
    count += 1;
  }
  return count;
}

/**
 * Attempt a single delivery with retries. Updates the WebhookDelivery record
 * with the final result.
 */
async function attemptDelivery(
  deliveryId: string,
  endpointId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<DeliveryResult> {
  const endpoint = await db.webhookEndpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint) {
    return { status: "failed", errorMessage: "Endpoint not found", attempts: 0 };
  }

  const payloadStr = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(endpoint.signingSecret, payloadStr, timestamp);

  let attempts = 0;
  let lastError: string | undefined;
  let lastResponseCode: number | undefined;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    attempts += 1;
    try {
      // Use AbortController for timeout (works in Node 18+ and Edge)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-atrina-event": eventType,
          "x-atrina-timestamp": String(timestamp),
          "x-atrina-signature": `t=${timestamp},s=${signature}`,
          "user-agent": "AtrinaBaaS-Webhook/1.0",
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      lastResponseCode = res.status;

      if (res.status >= 200 && res.status < 300) {
        // Success — update delivery
        await db.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "delivered",
            attempts,
            responseCode: res.status,
            deliveredAt: new Date(),
          },
        });
        logger.info("webhook.delivered", {
          module: "webhooks",
          deliveryId,
          endpointId,
          responseCode: res.status,
          attempts,
        });
        return { status: "delivered", responseCode: res.status, attempts };
      }

      // Non-2xx: retry if we have attempts left
      lastError = `HTTP ${res.status}`;
      logger.warn("webhook.delivery.non_2xx", {
        module: "webhooks",
        deliveryId,
        endpointId,
        responseCode: res.status,
        attempt: i + 1,
      });

      if (i < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
      }
    } catch (err) {
      lastError = (err as Error).name === "AbortError" ? "Timeout" : (err as Error).message;
      logger.warn("webhook.delivery.error", {
        module: "webhooks",
        deliveryId,
        endpointId,
        errorMessage: lastError,
        attempt: i + 1,
      });
      if (i < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
      }
    }
  }

  // All attempts failed
  await db.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "failed",
      attempts,
      responseCode: lastResponseCode,
      errorMessage: lastError,
    },
  });
  return { status: "failed", errorMessage: lastError, responseCode: lastResponseCode, attempts };
}

/**
 * Manually replay a delivery. Used by the dashboard "replay" button.
 */
export async function replayDelivery(deliveryId: string): Promise<DeliveryResult> {
  const delivery = await db.webhookDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new Error("Delivery not found");
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(delivery.payload);
  } catch {
    payload = {};
  }
  return attemptDelivery(delivery.id, delivery.endpointId, delivery.eventType, payload);
}
