<?php

namespace App\Services\Billing\Providers;

use App\Contracts\Billing\BillingProvider;
use App\Contracts\Billing\VerificationResult;
use App\Enums\BillingProviderName;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CafeBazaarBillingProvider implements BillingProvider
{
    public function name(): string
    {
        return BillingProviderName::CafeBazaar->value;
    }

    public function supportsRecurringSubscriptions(): bool
    {
        // Recurring semantics are not claimed in MVP; prepaid verify path only.
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
                errorMessage: 'Cafe Bazaar credentials are missing.',
            );
        }

        $url = sprintf(
            'https://pardakht.cafebazaar.ir/devapi/v2/api/validate/%s/inapp/%s/purchases/%s/',
            rawurlencode($package),
            rawurlencode($storeProductId),
            rawurlencode($purchaseToken),
        );

        try {
            $response = Http::timeout(15)
                ->withQueryParameters(['access_token' => $accessToken])
                ->acceptJson()
                ->get($url);
        } catch (Throwable $exception) {
            Log::warning('billing.cafebazaar.verify_failed', ['error' => $exception->getMessage()]);

            return new VerificationResult(
                valid: false,
                providerProductId: $storeProductId,
                providerTransactionId: null,
                purchasedAt: null,
                state: 'rejected',
                errorCode: 'PROVIDER_TIMEOUT',
                errorMessage: 'Cafe Bazaar verification failed.',
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
                errorMessage: (string) (data_get($payload, 'error') ?? 'Purchase could not be verified.'),
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
                state: $purchaseState === 1 ? 'refunded' : 'rejected',
                raw: is_array($payload) ? $this->redact($payload) : [],
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
            raw: $this->redact(is_array($payload) ? $payload : []),
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function redact(array $payload): array
    {
        unset($payload['purchaseToken']);

        return $payload;
    }
}
