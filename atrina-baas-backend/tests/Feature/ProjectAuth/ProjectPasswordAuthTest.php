<?php

namespace Tests\Feature\ProjectAuth;

use App\Enums\ApiCredentialKind;
use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Services\ApiCredentialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectPasswordAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_user_can_signup_and_login_with_publishable_key(): void
    {
        [$secret] = $this->makePublishableSecret();

        $signup = $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/signup', [
                'email' => 'player@example.com',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                'display_name' => 'Player One',
            ]);

        $signup->assertCreated()
            ->assertJsonPath('user.email', 'player@example.com')
            ->assertJsonStructure(['token', 'user' => ['id']]);

        $token = $signup->json('token');

        $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/v1/project-auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'player@example.com');

        $login = $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/login', [
                'email' => 'player@example.com',
                'password' => 'Password123!',
            ]);

        $login->assertOk()->assertJsonStructure(['token']);
    }

    public function test_project_user_token_cannot_access_control_plane(): void
    {
        [$secret] = $this->makePublishableSecret();

        $signup = $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/signup', [
                'email' => 'player@example.com',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ])->assertCreated();

        $this->withToken($signup->json('token'))
            ->getJson('/api/v1/organizations')
            ->assertForbidden();
    }

    public function test_auth_requires_project_credential(): void
    {
        $this->postJson('/api/v1/project-auth/login', [
            'email' => 'a@example.com',
            'password' => 'Password123!',
        ])->assertUnauthorized();
    }

    public function test_dashboard_can_list_and_block_project_users(): void
    {
        [$secret, $project, $owner] = $this->makePublishableSecret();

        $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/signup', [
                'email' => 'player@example.com',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ])->assertCreated();

        $projectUser = ProjectUser::query()->firstOrFail();

        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/projects/{$project->id}/users")
            ->assertOk()
            ->assertJsonPath('data.0.email', 'player@example.com');

        $this->patchJson("/api/v1/projects/{$project->id}/users/{$projectUser->id}", [
            'status' => 'blocked',
        ])->assertOk()->assertJsonPath('data.status', 'blocked');
    }

    /**
     * @return array{0: string, 1: Project, 2: User}
     */
    private function makePublishableSecret(): array
    {
        $owner = User::factory()->create();
        $organization = Organization::factory()->create();

        OrganizationMember::factory()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => OrganizationMemberRole::Owner,
            'status' => OrganizationMemberStatus::Active,
        ]);

        $project = Project::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $owner->id,
        ]);

        $environment = Environment::factory()->create([
            'project_id' => $project->id,
        ]);

        $created = app(ApiCredentialService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'Pub',
            kind: ApiCredentialKind::Publishable,
        );

        return [$created['secret'], $project, $owner];
    }
}
