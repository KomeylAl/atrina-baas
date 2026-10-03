<?php

namespace Tests\Feature\Tenancy;

use App\Enums\ApiCredentialKind;
use App\Enums\ApiCredentialStatus;
use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\ApiCredential;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\User;
use App\Services\ApiCredentialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiCredentialTest extends TestCase
{
    use RefreshDatabase;

    public function test_credential_secret_is_shown_only_once_on_create(): void
    {
        [, , $environment] = $this->actingWithEnvironment(OrganizationMemberRole::Developer);

        $response = $this->postJson("/api/v1/environments/{$environment->id}/credentials", [
            'name' => 'Publishable Key',
            'kind' => ApiCredentialKind::Publishable->value,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.secret_shown_once', true)
            ->assertJsonStructure(['data' => ['id', 'key_prefix', 'secret']]);

        $secret = $response->json('data.secret');
        $this->assertNotEmpty($secret);

        $this->getJson("/api/v1/environments/{$environment->id}/credentials")
            ->assertOk()
            ->assertJsonMissingPath('data.0.secret')
            ->assertJsonPath('data.0.key_prefix', $response->json('data.key_prefix'));
    }

    public function test_revoked_credential_is_rejected_by_verifier(): void
    {
        [$user, , $environment] = $this->actingWithEnvironment(OrganizationMemberRole::Admin);

        $created = app(ApiCredentialService::class)->create(
            environment: $environment,
            actor: $user,
            name: 'Server',
            kind: ApiCredentialKind::ServerSecret,
        );

        $this->postJson("/api/v1/credentials/{$created['credential']->id}/revoke")
            ->assertOk()
            ->assertJsonPath('data.status', ApiCredentialStatus::Revoked->value);

        $verified = app(ApiCredentialService::class)->verify($created['secret']);
        $this->assertNull($verified);
    }

    public function test_rotate_returns_new_secret_and_revokes_old(): void
    {
        [$user, , $environment] = $this->actingWithEnvironment(OrganizationMemberRole::Owner);

        $created = app(ApiCredentialService::class)->create(
            environment: $environment,
            actor: $user,
            name: 'Rotating',
            kind: ApiCredentialKind::Publishable,
        );

        $response = $this->postJson("/api/v1/credentials/{$created['credential']->id}/rotate")
            ->assertOk()
            ->assertJsonStructure(['data' => ['id', 'secret']]);

        $this->assertNotSame($created['secret'], $response->json('data.secret'));
        $this->assertSame(
            ApiCredentialStatus::Revoked,
            ApiCredential::query()->findOrFail($created['credential']->id)->status,
        );
        $this->assertNull(app(ApiCredentialService::class)->verify($created['secret']));
        $this->assertNotNull(app(ApiCredentialService::class)->verify($response->json('data.secret')));
    }

    public function test_outsider_cannot_manage_credentials(): void
    {
        [, , $environment] = $this->actingWithEnvironment(OrganizationMemberRole::Owner);

        $outsider = User::factory()->create();
        Sanctum::actingAs($outsider);

        $this->postJson("/api/v1/environments/{$environment->id}/credentials", [
            'name' => 'Nope',
            'kind' => ApiCredentialKind::Publishable->value,
        ])->assertForbidden();
    }

    /**
     * @return array{0: User, 1: Project, 2: Environment}
     */
    private function actingWithEnvironment(OrganizationMemberRole $role): array
    {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();

        OrganizationMember::factory()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => OrganizationMemberStatus::Active,
        ]);

        $project = Project::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $environment = Environment::factory()->create([
            'project_id' => $project->id,
        ]);

        Sanctum::actingAs($user);

        return [$user, $project, $environment];
    }
}
