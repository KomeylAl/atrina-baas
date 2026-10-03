<?php

namespace App\Http\Resources;

use App\Models\DataPolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DataPolicy
 */
class DataPolicyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'data_table_id' => $this->data_table_id,
            'operation' => $this->operation?->value ?? $this->operation,
            'subject' => $this->subject?->value ?? $this->subject,
            'policy_definition' => $this->policy_definition ?? [],
            'enabled' => (bool) $this->enabled,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
