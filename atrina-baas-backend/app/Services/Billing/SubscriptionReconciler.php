<?php

namespace App\Services\Billing;

use App\Enums\BillingProviderName;
use App\Enums\PurchaseStatus;
use App\Enums\SubscriptionStatus;
use App\Models\BillingProvider;
use App\Models\Purchase;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;

class SubscriptionReconciler
{
    public function __construct(private readonly BillingProviderRegistry $registry) {}

    /**
     * @return array{expired: int, revoked: int}
     */
    public function reconcile(): array
    {
        return [
            'expired' => $this->expireEndedSubscriptions(),
            'revoked' => $this->revokeRefundedPurchases(),
        ];
    }

    private function expireEndedSubscriptions(): int
    {
        $expired = Subscription::query()
            ->where('status', SubscriptionStatus::Active)
            ->where('current_period_end', '<=', now())
            ->get();

        foreach ($expired as $subscription) {
            $subscription->forceFill(['status' => SubscriptionStatus::Expired])->save();

            SubscriptionEvent::query()->firstOrCreate(
                [
                    'subscription_id' => $subscription->id,
                    'idempotency_key' => 'reconcile:expired:'.$subscription->current_period_end?->timestamp,
                ],
                [
                    'event_type' => 'subscription.expired',
                    'source' => 'reconciler',
                    'payload_redacted' => [
                        'current_period_end' => $subscription->current_period_end?->toIso8601String(),
                    ],
                    'occurred_at' => now(),
                    'processed_at' => now(),
                    'created_at' => now(),
                ],
            );
        }

        return $expired->count();
    }

    private function revokeRefundedPurchases(): int
    {
        $purchases = Purchase::query()
            ->where('status', PurchaseStatus::Verified)
            ->whereNotNull('provider_purchase_token_encrypted')
            ->orderBy('created_at')
            ->limit(200)
            ->get();

        $revoked = 0;

        foreach ($purchases as $purchase) {
            $token = $purchase->getPurchaseToken();
            if ($token === null) {
                continue;
            }

            $billingProvider = BillingProvider::query()
                ->where('environment_id', $purchase->environment_id)
                ->where('provider', $purchase->provider)
                ->where('status', 'active')
                ->first();

            if ($billingProvider === null && $purchase->provider !== BillingProviderName::Fake) {
                continue;
            }

            $configuration = $billingProvider?->getConfiguration() ?? ['package_name' => 'test.package'];
            $adapter = $this->registry->get($purchase->provider);

            $result = $adapter->verifyPurchase(
                configuration: $configuration,
                packageName: (string) ($configuration['package_name'] ?? ''),
                storeProductId: $purchase->provider_product_id,
                purchaseToken: $token,
            );

            $isRefund = $result->state === 'refunded' || $result->errorCode === 'PURCHASE_REFUNDED';
            if ($result->valid || ! $isRefund) {
                continue;
            }

            $purchase->forceFill([
                'status' => PurchaseStatus::Refunded,
                'raw_provider_payload' => $result->raw,
            ])->save();

            $subscriptions = Subscription::query()
                ->where('environment_id', $purchase->environment_id)
                ->where('project_user_id', $purchase->project_user_id)
                ->where('plan_id', $purchase->plan_id)
                ->where('provider', $purchase->provider)
                ->where('status', SubscriptionStatus::Active)
                ->get();

            foreach ($subscriptions as $subscription) {
                $subscription->forceFill(['status' => SubscriptionStatus::Revoked])->save();

                SubscriptionEvent::query()->firstOrCreate(
                    [
                        'subscription_id' => $subscription->id,
                        'idempotency_key' => 'reconcile:revoke:'.$purchase->id,
                    ],
                    [
                        'event_type' => 'subscription.revoked',
                        'source' => 'reconciler',
                        'payload_redacted' => [
                            'purchase_id' => $purchase->id,
                            'provider_state' => $result->state,
                        ],
                        'occurred_at' => now(),
                        'processed_at' => now(),
                        'created_at' => now(),
                    ],
                );

                $revoked++;
            }
        }

        return $revoked;
    }
}
