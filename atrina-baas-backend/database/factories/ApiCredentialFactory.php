<?php

namespace Database\Factories;

use App\Enums\ApiCredentialKind;
use App\Enums\ApiCredentialStatus;
use App\Models\ApiCredential;
use App\Models\Environment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ApiCredential>
 */
class ApiCredentialFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $secret = 'ak_pub_'.Str::lower(Str::random(40));

        return [
            'environment_id' => Environment::factory(),
            'name' => fake()->words(2, true),
            'key_prefix' => substr($secret, 0, 12),
            'secret_hash' => hash('sha256', $secret),
            'kind' => ApiCredentialKind::Publishable,
            'scopes' => [],
            'status' => ApiCredentialStatus::Active,
            'created_by' => User::factory(),
        ];
    }

    public function revoked(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ApiCredentialStatus::Revoked,
            'revoked_at' => now(),
        ]);
    }
}
