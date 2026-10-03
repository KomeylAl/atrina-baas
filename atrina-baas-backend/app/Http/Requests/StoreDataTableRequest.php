<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDataTableRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:64'],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'schema_definition' => ['required', 'array'],
            'schema_definition.columns' => ['required', 'array', 'min:1'],
            'policies' => ['sometimes', 'array'],
        ];
    }
}
