<?php

namespace App\Http\Resources;

use App\Models\DataRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DataRecord
 */
class DataRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'data_table_id' => $this->data_table_id,
            'environment_id' => $this->environment_id,
            'owner_id' => $this->owner_id,
            'attributes' => $this->resource->getAttribute('data'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
