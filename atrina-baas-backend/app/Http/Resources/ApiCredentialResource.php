<?php

namespace App\Http\Resources;

use App\Models\ApiCredential;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApiCredential
 */
class ApiCredentialResource extends JsonResource
{
    private ?string $plainSecret = null;

    public function withPlainSecret(string $secret): self
    {
        $this->plainSecret = $secret;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'environment_id' => $this->environment_id,
            'name' => $this->name,
            'key_prefix' => $this->key_prefix,
            'kind' => $this->kind?->value ?? $this->kind,
            'scopes' => $this->scopes ?? [],
            'status' => $this->status?->value ?? $this->status,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'last_used_at' => $this->last_used_at?->toIso8601String(),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'revoked_at' => $this->revoked_at?->toIso8601String(),
            ...($this->plainSecret !== null ? [
                'secret' => $this->plainSecret,
                'secret_shown_once' => true,
            ] : []),
        ];
    }
}
