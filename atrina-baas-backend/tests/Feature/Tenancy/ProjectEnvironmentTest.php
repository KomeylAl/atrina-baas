<?php

namespace Tests\Feature\Tenancy;

use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectEnvironmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_create_project_with_default_environments(): void
    {
        [$user, $organization] = $this->actingMember(OrganizationMemberRole::Developer);

        $response = $this->postJson("/api/v1/organizations/{$organization->id}/projects", [
            'name' => 'Mobile App',
            'slug' => 'mobile-app',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'mobile-app')
            ->assertJsonCount(2, 'data.environments');

        $this->assertDatabaseHas('environments', [
            'project_id' => $response->json('data.id'),
            'slug' => 'development',
        ]);
        $this->assertDatabaseHas('environments', [
            'project_id' => $response->json('data.id'),
            'slug' => 'production',
        ]);
    }

    public function test_outsider_cannot_access_project(): void
    {
        [$owner, $organization] = $this->actingMember(OrganizationMemberRole::Owner);
        $project = Project::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $owner->id,
        ]);

        $outsider = User::factory()->create();
        Sanctum::actingAs($outsider);

        $this->getJson("/api/v1/projects/{$project->id}")
            ->assertForbidden();
    }

    public function test_viewer_cannot_create_project(): void
    {
        [, $organization] = $this->actingMember(OrganizationMemberRole::Viewer);

        $this->postJson("/api/v1/organizations/{$organization->id}/projects", [
            'name' => 'Blocked',
        ])->assertForbidden();
    }

    public function test_admin_can_archive_project(): void
    {
        [$user, $organization] = $this->actingMember(OrganizationMemberRole::Admin);
        $project = Project::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $this->postJson("/api/v1/projects/{$project->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');
    }

    /**
     * @return array{0: User, 1: Organization}
     */
    private function actingMember(OrganizationMemberRole $role): array
    {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();

        OrganizationMember::factory()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => OrganizationMemberStatus::Active,
        ]);

        Sanctum::actingAs($user);

        return [$user, $organization];
    }
}
