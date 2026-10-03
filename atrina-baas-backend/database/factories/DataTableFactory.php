<?php

namespace Database\Factories;

use App\Enums\DataTableStatus;
use App\Models\DataTable;
use App\Models\Environment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DataTable>
 */
class DataTableFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'environment_id' => Environment::factory(),
            'project_id' => fn (array $attributes) => Environment::query()
                ->findOrFail($attributes['environment_id'])
                ->project_id,
            'name' => 'notes_'.fake()->unique()->numerify('###'),
            'display_name' => 'Notes',
            'schema_definition' => [
                'columns' => [
                    ['name' => 'title', 'type' => 'string', 'required' => true, 'max' => 120, 'default' => null],
                    ['name' => 'done', 'type' => 'boolean', 'required' => false, 'max' => null, 'default' => false],
                ],
            ],
            'status' => DataTableStatus::Active,
        ];
    }
}
