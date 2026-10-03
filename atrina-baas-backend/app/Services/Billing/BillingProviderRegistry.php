<?php

namespace App\Services\Billing;

use App\Contracts\Billing\BillingProvider;
use App\Enums\BillingProviderName;
use App\Services\Billing\Providers\CafeBazaarBillingProvider;
use App\Services\Billing\Providers\FakeBillingProvider;
use App\Services\Billing\Providers\MyketBillingProvider;
use InvalidArgumentException;

class BillingProviderRegistry
{
    /**
     * @var array<string, BillingProvider>
     */
    private array $providers;

    public function __construct(
        CafeBazaarBillingProvider $cafeBazaar,
        MyketBillingProvider $myket,
        FakeBillingProvider $fake,
    ) {
        $this->providers = [
            $cafeBazaar->name() => $cafeBazaar,
            $myket->name() => $myket,
            $fake->name() => $fake,
        ];
    }

    public function get(BillingProviderName|string $provider): BillingProvider
    {
        $name = $provider instanceof BillingProviderName ? $provider->value : $provider;

        if (! isset($this->providers[$name])) {
            throw new InvalidArgumentException("Unsupported billing provider [{$name}].");
        }

        return $this->providers[$name];
    }
}
