<?php

namespace App\Http\Requests\DataPlane;

use Illuminate\Foundation\Http\FormRequest;

class StoreDataRecordRequest extends FormRequest
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
            'data' => ['required', 'array'],
        ];
    }
}
