<?php

namespace App\Http\Requests\Billing;

use App\Enums\BillingProviderName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VerifyPurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'provider' => ['required', Rule::enum(BillingProviderName::class)],
            'store_product_id' => ['required', 'string', 'max:120'],
            'purchase_token' => ['required', 'string', 'max:4096'],
            'idempotency_key' => ['sometimes', 'nullable', 'string', 'max:120'],
        ];
    }
}
