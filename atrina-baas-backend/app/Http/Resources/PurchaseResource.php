<?php

namespace App\Http\Resources;

use App\Models\Purchase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Purchase */
class PurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_user_id' => $this->project_user_id,
            'plan_id' => $this->plan_id,
            'provider' => $this->provider?->value ?? $this->provider,
            'provider_product_id' => $this->provider_product_id,
            'provider_transaction_id' => $this->provider_transaction_id,
            'status' => $this->status?->value ?? $this->status,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'purchased_at' => $this->purchased_at?->toIso8601String(),
            'verified_at' => $this->verified_at?->toIso8601String(),
        ];
    }
}
