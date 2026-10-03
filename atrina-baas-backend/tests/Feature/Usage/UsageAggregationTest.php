<?php

namespace Tests\Feature\Usage;

use App\Enums\ApiCredentialKind;
use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Enums\UsageMetric;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\User;
use App\Services\ApiCredentialService;
use App\Services\Usage\UsageRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UsageAggregationTest extends TestCase
{
    use RefreshDatabase;

    public function test_data_plane_requests_are_counted_and_quotas_enforce_hard_limit(): void
    {
        [$owner, $project, $environment, $secret] = $this->bootstrap();

        $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/signup', [
                'email' => 'u1@example.com',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ])
            ->assertCreated();

        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/projects/'.$project->id.'/usage')
            ->assertOk()
            ->assertJsonFragment(['metric' => UsageMetric::AuthSignins->value])
            ->assertJsonFragment(['metric' => UsageMetric::ApiRequests->value]);

        $this->putJson('/api/v1/environments/'.$environment->id.'/quotas', [
            'metric' => UsageMetric::ApiRequests->value,
            'soft_limit' => 1,
            'hard_limit' => 2,
            'window_seconds' => 3600,
        ])->assertCreated();

        // Current api_requests already includes the signup request (>=1).
        // One more request should soft-warn; crossing hard_limit should 429.
        $this->withHeader('X-Atrina-Key', $secret)
            ->getJson('/api/v1/billing/products')
            ->assertOk();

        $blocked = $this->withHeader('X-Atrina-Key', $secret)
            ->getJson('/api/v1/billing/products');

        $blocked->assertStatus(429);
    }

    public function test_usage_aggregation_matches_recorder_totals(): void
    {
        [$owner, $project, $environment] = $this->bootstrap();

        app(UsageRecorder::class)->record($environment, UsageMetric::DataReads, 3);
        app(UsageRecorder::class)->record($environment, UsageMetric::DataWrites, 2);

        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/projects/'.$project->id.'/usage')
            ->assertOk()
            ->assertJsonFragment(['metric' => 'data_reads', 'quantity' => 3])
            ->assertJsonFragment(['metric' => 'data_writes', 'quantity' => 2]);
    }

    /**
     * @return array{0: User, 1: Project, 2: Environment, 3: string}
     */
    private function bootstrap(): array
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

        return [$owner, $project, $environment, $secret];
    }
}
