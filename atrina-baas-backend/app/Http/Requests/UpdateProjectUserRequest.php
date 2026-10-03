<?php

namespace App\Http\Requests;

use App\Enums\ProjectUserStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectUserRequest extends FormRequest
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
            'status' => ['sometimes', Rule::in([
                ProjectUserStatus::Active->value,
                ProjectUserStatus::Blocked->value,
            ])],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
        ];
    }
}
