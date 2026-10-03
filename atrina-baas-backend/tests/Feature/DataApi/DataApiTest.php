<?php

namespace Tests\Feature\DataApi;

use App\Enums\ApiCredentialKind;
use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\DataRecord;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\User;
use App\Services\ApiCredentialService;
use App\Services\Data\DataTableService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DataApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_crud_own_records_only(): void
    {
        [$pubSecret, $environment, $owner] = $this->bootstrapEnvironment();

        $table = app(DataTableService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'notes',
            displayName: 'Notes',
            schemaDefinition: [
                'columns' => [
                    ['name' => 'title', 'type' => 'string', 'required' => true, 'max' => 80],
                    ['name' => 'done', 'type' => 'boolean', 'required' => false, 'default' => false],
                ],
            ],
        );

        $userA = $this->signupProjectUser($pubSecret, 'a@example.com');
        $userB = $this->signupProjectUser($pubSecret, 'b@example.com');

        $created = $this->withHeaders([
            'X-Atrina-Key' => $pubSecret,
            'Authorization' => 'Bearer '.$userA,
        ])->postJson('/api/v1/data/notes', [
            'data' => ['title' => 'Hello', 'done' => false],
        ]);

        $created->assertCreated()->assertJsonPath('data.attributes.title', 'Hello');
        $recordId = $created->json('data.id');

        $this->withHeaders([
            'X-Atrina-Key' => $pubSecret,
            'Authorization' => 'Bearer '.$userB,
        ])->getJson("/api/v1/data/notes/{$recordId}")
            ->assertForbidden();

        $this->withHeaders([
            'X-Atrina-Key' => $pubSecret,
            'Authorization' => 'Bearer '.$userA,
        ])->patchJson("/api/v1/data/notes/{$recordId}", [
            'data' => ['done' => true],
        ])->assertOk()->assertJsonPath('data.attributes.done', true);

        $this->assertSame(1, DataRecord::query()->where('data_table_id', $table->id)->count());
    }

    public function test_anonymous_access_is_denied_by_default(): void
    {
        [$pubSecret, $environment, $owner] = $this->bootstrapEnvironment();

        app(DataTableService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'notes',
            displayName: 'Notes',
            schemaDefinition: [
                'columns' => [
                    ['name' => 'title', 'type' => 'string', 'required' => true],
                ],
            ],
        );

        $this->withHeader('X-Atrina-Key', $pubSecret)
            ->getJson('/api/v1/data/notes')
            ->assertForbidden();
    }

    public function test_invalid_payload_and_unknown_fields_are_rejected(): void
    {
        [$pubSecret, $environment, $owner] = $this->bootstrapEnvironment();

        app(DataTableService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'notes',
            displayName: 'Notes',
            schemaDefinition: [
                'columns' => [
                    ['name' => 'title', 'type' => 'string', 'required' => true, 'max' => 10],
                ],
            ],
        );

        $token = $this->signupProjectUser($pubSecret, 'player@example.com');

        $this->withHeaders([
            'X-Atrina-Key' => $pubSecret,
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/data/notes', [
            'data' => ['title' => 'too-long-title', 'extra' => 1],
        ])->assertUnprocessable();
    }

    public function test_cross_environment_credential_cannot_read_other_env_table(): void
    {
        [$pubSecret, $environment, $owner] = $this->bootstrapEnvironment();

        app(DataTableService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'notes',
            displayName: 'Notes',
            schemaDefinition: [
                'columns' => [
                    ['name' => 'title', 'type' => 'string', 'required' => true],
                ],
            ],
        );

        $otherEnv = Environment::factory()->production()->create([
            'project_id' => $environment->project_id,
        ]);

        $otherSecret = app(ApiCredentialService::class)->create(
            environment: $otherEnv,
            actor: $owner,
            name: 'Other',
            kind: ApiCredentialKind::Publishable,
        )['secret'];

        $this->withHeader('X-Atrina-Key', $otherSecret)
            ->getJson('/api/v1/data/notes')
            ->assertNotFound();
    }

    public function test_dashboard_can_manage_tables_and_explore_readonly(): void
    {
        [, $environment, $owner] = $this->bootstrapEnvironment();
        Sanctum::actingAs($owner);

        $create = $this->postJson("/api/v1/environments/{$environment->id}/data-tables", [
            'name' => 'tasks',
            'display_name' => 'Tasks',
            'schema_definition' => [
                'columns' => [
                    ['name' => 'title', 'type' => 'string', 'required' => true],
                ],
            ],
        ]);

        $create->assertCreated()->assertJsonPath('data.name', 'tasks');
        $tableId = $create->json('data.id');

        $this->getJson("/api/v1/data-tables/{$tableId}/records")
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    public function test_server_secret_can_list_all_records(): void
    {
        [$pubSecret, $environment, $owner] = $this->bootstrapEnvironment();

        app(DataTableService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'notes',
            displayName: 'Notes',
            schemaDefinition: [
                'columns' => [
                    ['name' => 'title', 'type' => 'string', 'required' => true],
                ],
            ],
        );

        $token = $this->signupProjectUser($pubSecret, 'owner-user@example.com');

        $this->withHeaders([
            'X-Atrina-Key' => $pubSecret,
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/data/notes', [
            'data' => ['title' => 'Mine'],
        ])->assertCreated();

        $serverSecret = app(ApiCredentialService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'Server',
            kind: ApiCredentialKind::ServerSecret,
        )['secret'];

        $this->withHeader('X-Atrina-Key', $serverSecret)
            ->getJson('/api/v1/data/notes')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    /**
     * @return array{0: string, 1: Environment, 2: User}
     */
    private function bootstrapEnvironment(): array
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

        $secret = app(ApiCredentialService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'Pub',
            kind: ApiCredentialKind::Publishable,
        )['secret'];

        return [$secret, $environment, $owner];
    }

    private function signupProjectUser(string $secret, string $email): string
    {
        return $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/signup', [
                'email' => $email,
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ])
            ->assertCreated()
            ->json('token');
    }
}
