<?php

namespace App\Http\Resources;

use App\Models\ProjectUser;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProjectUser
 */
class ProjectUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'environment_id' => $this->environment_id,
            'email' => $this->email,
            'phone' => $this->phone,
            'display_name' => $this->display_name,
            'status' => $this->status?->value ?? $this->status,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'phone_verified_at' => $this->phone_verified_at?->toIso8601String(),
            'last_sign_in_at' => $this->last_sign_in_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
