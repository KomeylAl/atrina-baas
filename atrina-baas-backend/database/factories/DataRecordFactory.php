<?php

namespace Database\Factories;

use App\Models\DataRecord;
use App\Models\DataTable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DataRecord>
 */
class DataRecordFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'data_table_id' => DataTable::factory(),
            'environment_id' => fn (array $attributes) => DataTable::query()
                ->findOrFail($attributes['data_table_id'])
                ->environment_id,
            'project_id' => fn (array $attributes) => DataTable::query()
                ->findOrFail($attributes['data_table_id'])
                ->project_id,
            'owner_id' => null,
            'data' => [
                'title' => fake()->sentence(3),
                'done' => false,
            ],
        ];
    }
}
