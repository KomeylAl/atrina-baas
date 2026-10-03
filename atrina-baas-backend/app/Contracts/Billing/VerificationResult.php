<?php

namespace App\Contracts\Billing;

readonly class VerificationResult
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public bool $valid,
        public string $providerProductId,
        public ?string $providerTransactionId,
        public ?\DateTimeInterface $purchasedAt,
        public string $state,
        public array $raw = [],
        public ?string $errorCode = null,
        public ?string $errorMessage = null,
    ) {}
}
