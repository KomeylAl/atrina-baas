<?php

namespace Tests\Feature\Tenancy;

use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizationRouteBindingTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_can_be_resolved_by_slug_for_project_create(): void
    {
        $user = User::factory()->create();
        $organization = Organization::factory()->create([
            'slug' => 'projects',
            'name' => 'Projects Org',
        ]);

        OrganizationMember::factory()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => OrganizationMemberRole::Owner,
            'status' => OrganizationMemberStatus::Active,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/organizations/projects/projects', [
            'name' => 'Mobile App',
            'slug' => 'mobile-app',
        ])
            ->assertCreated()
            ->assertJsonPath('data.organization_id', $organization->id)
            ->assertJsonPath('data.slug', 'mobile-app');
    }
}
