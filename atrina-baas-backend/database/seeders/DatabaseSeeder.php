<?php

namespace Database\Seeders;

use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Enums\PlatformUserStatus;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Services\ProjectService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $owner = User::query()->create([
            'name' => 'Atrina Owner',
            'email' => 'owner@atrina.local',
            'password' => 'password',
            'status' => PlatformUserStatus::Active,
            'email_verified_at' => now(),
        ]);

        $organization = Organization::query()->create([
            'name' => 'Atrina',
            'slug' => 'atrina',
            'status' => 'active',
        ]);

        OrganizationMember::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => OrganizationMemberRole::Owner,
            'status' => OrganizationMemberStatus::Active,
        ]);

        app(ProjectService::class)->create(
            organization: $organization,
            actor: $owner,
            name: 'Demo App',
            slug: 'demo-app',
            description: 'Seeded demo project for local development.',
        );
    }
}
