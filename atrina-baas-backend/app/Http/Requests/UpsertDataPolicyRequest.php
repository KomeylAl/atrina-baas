<?php

namespace App\Http\Requests;

use App\Enums\DataPolicyOperation;
use App\Enums\DataPolicySubject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertDataPolicyRequest extends FormRequest
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
            'operation' => ['required', Rule::enum(DataPolicyOperation::class)],
            'subject' => ['required', Rule::enum(DataPolicySubject::class)],
            'policy_definition' => ['sometimes', 'array'],
            'enabled' => ['sometimes', 'boolean'],
        ];
    }
}
