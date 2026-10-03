<?php

namespace App\Http\Requests;

use App\Enums\ApiCredentialKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApiCredentialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'kind' => ['required', Rule::enum(ApiCredentialKind::class)],
            'scopes' => ['sometimes', 'array'],
            'scopes.*' => ['string', 'max:64'],
            'expires_at' => ['sometimes', 'nullable', 'date', 'after:now'],
        ];
    }
}
