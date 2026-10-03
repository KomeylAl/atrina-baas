<?php

namespace App\Http\Resources;

use App\Models\DataTable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DataTable
 */
class DataTableResource extends JsonResource
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
            'name' => $this->name,
            'display_name' => $this->display_name,
            'schema_definition' => $this->schema_definition,
            'status' => $this->status?->value ?? $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'policies' => DataPolicyResource::collection($this->whenLoaded('policies')),
        ];
    }
}
