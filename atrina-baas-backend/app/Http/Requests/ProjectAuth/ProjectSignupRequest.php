<?php

namespace App\Http\Requests\ProjectAuth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ProjectSignupRequest extends FormRequest
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
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'device_name' => ['sometimes', 'string', 'max:100'],
        ];
    }
}
