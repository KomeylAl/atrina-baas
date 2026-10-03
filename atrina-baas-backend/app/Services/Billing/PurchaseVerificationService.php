<?php

namespace App\Services\Billing;

use App\Enums\BillingProviderName;
use App\Enums\PurchaseStatus;
use App\Enums\SubscriptionStatus;
use App\Models\BillingProvider;
use App\Models\Environment;
use App\Models\ProjectUser;
use App\Models\ProviderProduct;
use App\Models\Purchase;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseVerificationService
{
    public function __construct(
        private readonly BillingProviderRegistry $registry,
        private readonly SubscriptionPeriodCalculator $periods,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * @return array{purchase: Purchase, subscription: Subscription, replayed: bool}
     */
    public function verify(
        Environment $environment,
        ProjectUser $user,
        BillingProviderName $providerName,
        string $storeProductId,
        string $purchaseToken,
        ?string $idempotencyKey = null,
    ): array {
        if ($user->environment_id !== $environment->id) {
            throw ValidationException::withMessages([
                'purchase_token' => ['User/environment mismatch.'],
            ]);
        }

        if ($providerName === BillingProviderName::Fake && ! app()->environment(['local', 'testing'])) {
            throw ValidationException::withMessages([
                'provider' => ['Fake billing provider is not available in this environment.'],
            ]);
        }

        $tokenHash = hash('sha256', $purchaseToken);

        $existing = Purchase::query()
            ->where('environment_id', $environment->id)
            ->where('provider', $providerName)
            ->where('provider_purchase_token_hash', $tokenHash)
            ->first();

        if ($existing !== null) {
            $subscription = Subscription::query()
                ->where('project_user_id', $user->id)
                ->where('plan_id', $existing->plan_id)
                ->where('provider', $providerName)
                ->latest('created_at')
                ->first();

            if ($existing->status === PurchaseStatus::Verified && $subscription !== null) {
                return [
                    'purchase' => $existing,
                    'subscription' => $subscription,
                    'replayed' => true,
                ];
            }

            if ($existing->status === PurchaseStatus::Rejected) {
                throw ValidationException::withMessages([
                    'purchase_token' => ['This purchase was previously rejected.'],
                ]);
            }
        }

        $mapping = ProviderProduct::query()
            ->where('environment_id', $environment->id)
            ->where('provider', $providerName)
            ->where('store_product_id', $storeProductId)
            ->where('status', 'active')
            ->with('plan.product')
            ->first();

        if ($mapping === null || $mapping->plan?->product?->project_id !== $environment->project_id) {
            throw ValidationException::withMessages([
                'store_product_id' => ['Unknown store product mapping for this environment.'],
            ]);
        }

        $billingProvider = BillingProvider::query()
            ->where('environment_id', $environment->id)
            ->where('provider', $providerName)
            ->where('status', 'active')
            ->first();

        if ($billingProvider === null && $providerName !== BillingProviderName::Fake) {
            throw ValidationException::withMessages([
                'provider' => ['Billing provider is not configured for this environment.'],
            ]);
        }

        $adapter = $this->registry->get($providerName);
        $configuration = $billingProvider?->getConfiguration() ?? ['package_name' => 'test.package'];

        $result = $adapter->verifyPurchase(
            configuration: $configuration,
            packageName: (string) ($configuration['package_name'] ?? ''),
            storeProductId: $storeProductId,
            purchaseToken: $purchaseToken,
        );

        return DB::transaction(function () use (
            $environment,
            $user,
            $providerName,
            $storeProductId,
            $purchaseToken,
            $tokenHash,
            $mapping,
            $result,
            $idempotencyKey,
            $existing,
        ) {
            $purchase = $existing ?? new Purchase([
                'project_id' => $environment->project_id,
                'environment_id' => $environment->id,
                'project_user_id' => $user->id,
                'plan_id' => $mapping->plan_id,
                'provider' => $providerName,
                'provider_product_id' => $storeProductId,
            ]);

            $purchase->setPurchaseToken($purchaseToken);
            $purchase->provider_purchase_token_hash = $tokenHash;
            $purchase->idempotency_key = $idempotencyKey;
            $purchase->raw_provider_payload = $result->raw;
            $purchase->provider_transaction_id = $result->providerTransactionId;
            $purchase->purchased_at = $result->purchasedAt;
            $purchase->amount = $mapping->plan->price;
            $purchase->currency = $mapping->plan->currency;

            if (! $result->valid) {
                $purchase->status = $result->state === 'refunded'
                    ? PurchaseStatus::Refunded
                    : PurchaseStatus::Rejected;
                $purchase->save();

                throw ValidationException::withMessages([
                    'purchase_token' => [$result->errorMessage ?? 'Purchase verification failed.'],
                ]);
            }

            $purchase->status = PurchaseStatus::Verified;
            $purchase->verified_at = now();
            $purchase->save();

            $subscription = Subscription::query()
                ->where('project_user_id', $user->id)
                ->where('plan_id', $mapping->plan_id)
                ->where('provider', $providerName)
                ->whereIn('status', [
                    SubscriptionStatus::Active->value,
                    SubscriptionStatus::Pending->value,
                ])
                ->latest('current_period_end')
                ->first();

            $base = ($subscription?->current_period_end && $subscription->current_period_end->isFuture())
                ? $subscription->current_period_end
                : null;

            $period = $this->periods->extendFrom($mapping->plan, $base);

            if ($subscription === null) {
                $subscription = Subscription::query()->create([
                    'project_id' => $environment->project_id,
                    'environment_id' => $environment->id,
                    'project_user_id' => $user->id,
                    'plan_id' => $mapping->plan_id,
                    'provider' => $providerName,
                    'status' => SubscriptionStatus::Active,
                    'current_period_start' => $period['start'],
                    'current_period_end' => $period['end'],
                    'cancel_at_period_end' => false,
                    'provider_subscription_id' => $result->providerTransactionId,
                ]);
            } else {
                $subscription->forceFill([
                    'status' => SubscriptionStatus::Active,
                    'current_period_start' => $subscription->current_period_start ?? $period['start'],
                    'current_period_end' => $period['end'],
                    'provider_subscription_id' => $result->providerTransactionId ?? $subscription->provider_subscription_id,
                ])->save();
            }

            SubscriptionEvent::query()->firstOrCreate(
                [
                    'subscription_id' => $subscription->id,
                    'idempotency_key' => 'purchase:'.$tokenHash,
                ],
                [
                    'event_type' => 'purchase.verified',
                    'source' => $providerName->value,
                    'payload_redacted' => [
                        'store_product_id' => $storeProductId,
                        'provider_transaction_id' => $result->providerTransactionId,
                    ],
                    'occurred_at' => now(),
                    'processed_at' => now(),
                    'created_at' => now(),
                ],
            );

            $environment->loadMissing('project');

            $this->auditLogger->record(
                action: 'billing.purchase_verified',
                resourceType: 'purchase',
                resourceId: $purchase->id,
                actor: null,
                organizationId: $environment->project->organization_id,
                projectId: $environment->project_id,
                environmentId: $environment->id,
                metadata: [
                    'provider' => $providerName->value,
                    'plan_id' => $mapping->plan_id,
                    'project_user_id' => $user->id,
                ],
            );

            return [
                'purchase' => $purchase->refresh(),
                'subscription' => $subscription->refresh(),
                'replayed' => false,
            ];
        });
    }
}
