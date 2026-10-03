<?php

namespace App\Http\Requests;

use App\Enums\DataTableStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDataTableRequest extends FormRequest
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
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'schema_definition' => ['sometimes', 'array'],
            'schema_definition.columns' => ['required_with:schema_definition', 'array', 'min:1'],
            'status' => ['sometimes', Rule::enum(DataTableStatus::class)],
        ];
    }
}
