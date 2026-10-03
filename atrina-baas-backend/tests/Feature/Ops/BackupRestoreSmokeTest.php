<?php

namespace Tests\Feature\Ops;

use App\Enums\UsageMetric;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\Project;
use App\Models\UsageEvent;
use App\Models\User;
use App\Services\Ops\DatabaseSnapshotService;
use App\Services\Usage\UsageRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackupRestoreSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_logical_snapshot_round_trip_restores_usage_events(): void
    {
        $owner = User::factory()->create();
        $organization = Organization::factory()->create();
        $project = Project::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $owner->id,
        ]);
        $environment = Environment::factory()->create([
            'project_id' => $project->id,
        ]);

        app(UsageRecorder::class)->record($environment, UsageMetric::ApiRequests, 5);

        $service = app(DatabaseSnapshotService::class);
        $snapshot = $service->export();

        $this->assertSame(1, $snapshot['version']);
        $this->assertNotEmpty($snapshot['usage_events']);

        // Wipe usage and reimport.
        UsageEvent::query()->delete();
        $this->assertDatabaseCount('usage_events', 0);

        $service->import($snapshot);

        $this->assertDatabaseCount('usage_events', count($snapshot['usage_events']));
        $this->assertDatabaseHas('usage_events', [
            'project_id' => $project->id,
            'metric' => UsageMetric::ApiRequests->value,
            'quantity' => 5,
        ]);
    }
}
