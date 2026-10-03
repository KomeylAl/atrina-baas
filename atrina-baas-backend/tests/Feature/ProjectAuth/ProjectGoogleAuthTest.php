<?php

namespace Tests\Feature\ProjectAuth;

use App\Contracts\GoogleIdentityVerifier;
use App\Enums\ApiCredentialKind;
use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\User;
use App\Services\ApiCredentialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectGoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_login_creates_project_user(): void
    {
        $this->app->instance(GoogleIdentityVerifier::class, new class implements GoogleIdentityVerifier
        {
            public function verifyIdToken(string $idToken): array
            {
                return [
                    'subject' => 'google-sub-123',
                    'email' => 'google.user@example.com',
                    'name' => 'Google User',
                    'email_verified' => true,
                ];
            }
        });

        $secret = $this->makePublishableSecret();

        $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/google', [
                'id_token' => 'fake-google-token',
            ])
            ->assertOk()
            ->assertJsonPath('user.email', 'google.user@example.com')
            ->assertJsonStructure(['token']);
    }

    private function makePublishableSecret(): string
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

        return app(ApiCredentialService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'Pub',
            kind: ApiCredentialKind::Publishable,
        )['secret'];
    }
}
