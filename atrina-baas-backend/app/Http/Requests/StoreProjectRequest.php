<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
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
            'slug' => ['sometimes', 'nullable', 'string', 'max:120', 'alpha_dash'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
