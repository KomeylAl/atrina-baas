<?php

namespace App\Services\Billing\Providers;

use App\Contracts\Billing\BillingProvider;
use App\Contracts\Billing\VerificationResult;
use App\Enums\BillingProviderName;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class MyketBillingProvider implements BillingProvider
{
    public function name(): string
    {
        return BillingProviderName::Myket->value;
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
        $accessToken = (string) ($configuration['access_token'] ?? '');
        $package = (string) ($configuration['package_name'] ?? $packageName);

        if ($accessToken === '' || $package === '') {
            return new VerificationResult(
                valid: false,
                providerProductId: $storeProductId,
                providerTransactionId: null,
                purchasedAt: null,
                state: 'rejected',
                errorCode: 'PROVIDER_NOT_CONFIGURED',
                errorMessage: 'Myket credentials are missing.',
            );
        }

        // Prefer current partner verify API documented by Myket KB.
        $url = sprintf(
            'https://developer.myket.ir/api/partners/applications/%s/purchases/products/%s/verify',
            rawurlencode($package),
            rawurlencode($storeProductId),
        );

        try {
            $response = Http::timeout(15)
                ->withHeaders([
                    'X-Access-Token' => $accessToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post($url, ['tokenId' => $purchaseToken]);
        } catch (Throwable $exception) {
            Log::warning('billing.myket.verify_failed', ['error' => $exception->getMessage()]);

            return new VerificationResult(
                valid: false,
                providerProductId: $storeProductId,
                providerTransactionId: null,
                purchasedAt: null,
                state: 'rejected',
                errorCode: 'PROVIDER_TIMEOUT',
                errorMessage: 'Myket verification failed.',
            );
        }

        $payload = $response->json() ?? [];

        if (! $response->successful()) {
            return new VerificationResult(
                valid: false,
                providerProductId: $storeProductId,
                providerTransactionId: null,
                purchasedAt: null,
                state: 'rejected',
                raw: is_array($payload) ? $payload : [],
                errorCode: 'PROVIDER_REJECTED',
                errorMessage: 'Purchase could not be verified.',
            );
        }

        $purchaseState = (int) data_get($payload, 'purchaseState', 1);
        $purchaseTimeMs = data_get($payload, 'purchaseTime');
        $purchasedAt = is_numeric($purchaseTimeMs)
            ? now()->setTimestamp((int) floor(((int) $purchaseTimeMs) / 1000))
            : null;

        if ($purchaseState !== 0) {
            return new VerificationResult(
                valid: false,
                providerProductId: $storeProductId,
                providerTransactionId: data_get($payload, 'orderId'),
                purchasedAt: $purchasedAt,
                state: 'rejected',
                raw: is_array($payload) ? $payload : [],
                errorCode: 'PURCHASE_NOT_ACTIVE',
                errorMessage: 'Purchase is not in a successful state.',
            );
        }

        return new VerificationResult(
            valid: true,
            providerProductId: $storeProductId,
            providerTransactionId: data_get($payload, 'orderId'),
            purchasedAt: $purchasedAt,
            state: 'verified',
            raw: is_array($payload) ? $payload : [],
        );
    }
}
