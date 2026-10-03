<?php

namespace App\Http\Requests;

use App\Enums\EnvironmentStatus;
use App\Enums\EnvironmentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEnvironmentRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:120'],
            'slug' => ['sometimes', 'string', 'max:120', 'alpha_dash'],
            'type' => ['sometimes', Rule::enum(EnvironmentType::class)],
            'status' => ['sometimes', Rule::enum(EnvironmentStatus::class)],
        ];
    }
}
