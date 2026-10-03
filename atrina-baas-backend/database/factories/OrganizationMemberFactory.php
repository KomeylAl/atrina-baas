<?php

namespace Database\Factories;

use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrganizationMember>
 */
class OrganizationMemberFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'user_id' => User::factory(),
            'role' => OrganizationMemberRole::Developer,
            'status' => OrganizationMemberStatus::Active,
        ];
    }

    public function owner(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => OrganizationMemberRole::Owner,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => OrganizationMemberRole::Admin,
        ]);
    }

    public function viewer(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => OrganizationMemberRole::Viewer,
        ]);
    }
}
