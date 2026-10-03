<?php

namespace Database\Factories;

use App\Enums\EnvironmentStatus;
use App\Enums\EnvironmentType;
use App\Models\Environment;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Environment>
 */
class EnvironmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => 'Development',
            'slug' => 'development',
            'type' => EnvironmentType::Development,
            'status' => EnvironmentStatus::Active,
        ];
    }

    public function production(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Production',
            'slug' => 'production',
            'type' => EnvironmentType::Production,
        ]);
    }
}
