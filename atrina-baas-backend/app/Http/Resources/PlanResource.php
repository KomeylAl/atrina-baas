<?php

namespace App\Http\Resources;

use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Plan */
class PlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'code' => $this->code,
            'name' => $this->name,
            'billing_period_unit' => $this->billing_period_unit?->value ?? $this->billing_period_unit,
            'billing_period_count' => $this->billing_period_count,
            'price' => $this->price,
            'currency' => $this->currency,
            'status' => $this->status,
            'features' => $this->features,
            'renewal_mode' => 'prepaid_non_renewing',
        ];
    }
}
