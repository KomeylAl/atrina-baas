<?php

namespace Database\Factories;

use App\Enums\ProjectUserStatus;
use App\Models\Environment;
use App\Models\ProjectUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<ProjectUser>
 */
class ProjectUserFactory extends Factory
{
    protected static ?string $password;

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
            'email' => fake()->unique()->safeEmail(),
            'phone' => null,
            'password' => static::$password ??= Hash::make('password'),
            'display_name' => fake()->name(),
            'status' => ProjectUserStatus::Active,
            'email_verified_at' => now(),
        ];
    }

    public function blocked(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProjectUserStatus::Blocked,
        ]);
    }

    public function withPhone(?string $phone = null): static
    {
        return $this->state(fn (array $attributes) => [
            'phone' => $phone ?? '+98912'.fake()->numerify('#######'),
            'email' => null,
            'password' => null,
            'phone_verified_at' => now(),
        ]);
    }
}
