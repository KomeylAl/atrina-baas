<?php

namespace App\Contracts;

readonly class SmsSendResult
{
    public function __construct(
        public bool $success,
        public ?string $providerMessageId = null,
        public ?string $errorMessage = null,
        public array $raw = [],
    ) {}
}
