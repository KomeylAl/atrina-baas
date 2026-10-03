<?php

namespace App\Services\Billing\Providers;

use App\Contracts\Billing\BillingProvider;
use App\Contracts\Billing\VerificationResult;
use App\Enums\BillingProviderName;

class FakeBillingProvider implements BillingProvider
{
    public function name(): string
    {
        return BillingProviderName::Fake->value;
    }

    public function supportsRecurringSubscriptions(): bool
    {
        return false;
    }

    public function verifyPurchase(
        array $configuration,
        string $packageName,
        string $storeProductId,
        string $purchaseToken,
    ): VerificationResult {
        if (str_starts_with($purchaseToken, 'invalid') || str_starts_with($purchaseToken, 'forged')) {
            return new VerificationResult(
                valid: false,
                providerProductId: $storeProductId,
                providerTransactionId: null,
                purchasedAt: null,
                state: 'rejected',
                errorCode: 'PURCHASE_NOT_ACTIVE',
                errorMessage: 'Fake provider rejected token.',
            );
        }

        $tokenHash = hash('sha256', $purchaseToken);
        $refundedHashes = $configuration['refunded_token_hashes'] ?? [];

        if (
            str_starts_with($purchaseToken, 'refunded')
            || (is_array($refundedHashes) && in_array($tokenHash, $refundedHashes, true))
        ) {
            return new VerificationResult(
                valid: false,
                providerProductId: $storeProductId,
                providerTransactionId: 'txn_refunded',
                purchasedAt: now()->subDay(),
                state: 'refunded',
                errorCode: 'PURCHASE_REFUNDED',
                errorMessage: 'Purchase was refunded.',
            );
        }

        return new VerificationResult(
            valid: true,
            providerProductId: $storeProductId,
            providerTransactionId: 'txn_'.substr(hash('sha256', $purchaseToken), 0, 12),
            purchasedAt: now()->subMinute(),
            state: 'verified',
            raw: ['fake' => true],
        );
    }
}
