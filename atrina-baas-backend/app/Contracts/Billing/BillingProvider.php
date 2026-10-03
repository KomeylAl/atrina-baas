<?php

namespace App\Contracts\Billing;

interface BillingProvider
{
    public function name(): string;

    /**
     * @param  array<string, mixed>  $configuration
     */
    public function verifyPurchase(
        array $configuration,
        string $packageName,
        string $storeProductId,
        string $purchaseToken,
    ): VerificationResult;

    public function supportsRecurringSubscriptions(): bool;
}
