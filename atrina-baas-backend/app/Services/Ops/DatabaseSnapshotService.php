<?php

namespace App\Services\Ops;

use App\Models\Environment;
use App\Models\Organization;
use App\Models\Project;
use App\Models\UsageEvent;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Logical control-plane snapshot for restore smoke tests (not a substitute for pg_dump).
 */
class DatabaseSnapshotService
{
    /**
     * @return array{version: int, exported_at: string, organizations: list<array<string, mixed>>, projects: list<array<string, mixed>>, environments: list<array<string, mixed>>, usage_events: list<array<string, mixed>>}
     */
    public function export(): array
    {
        return [
            'version' => 1,
            'exported_at' => now()->toIso8601String(),
            'organizations' => Organization::query()->orderBy('id')->get()->map->only(['id', 'name', 'slug', 'status'])->all(),
            'projects' => Project::query()->orderBy('id')->get()->map->only(['id', 'organization_id', 'name', 'slug', 'status', 'created_by'])->all(),
            'environments' => Environment::query()->orderBy('id')->get()->map->only(['id', 'project_id', 'name', 'slug', 'type', 'status'])->all(),
            'usage_events' => UsageEvent::query()->orderBy('id')->get()->map->only([
                'id', 'project_id', 'environment_id', 'metric', 'quantity', 'unit', 'source', 'idempotency_key', 'occurred_at', 'created_at',
            ])->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $snapshot
     */
    public function import(array $snapshot): void
    {
        if (($snapshot['version'] ?? null) !== 1) {
            throw new RuntimeException('Unsupported snapshot version.');
        }

        DB::transaction(function () use ($snapshot) {
            foreach ($snapshot['organizations'] ?? [] as $row) {
                Organization::query()->updateOrCreate(['id' => $row['id']], $row);
            }

            foreach ($snapshot['projects'] ?? [] as $row) {
                Project::query()->updateOrCreate(['id' => $row['id']], $row);
            }

            foreach ($snapshot['environments'] ?? [] as $row) {
                Environment::query()->updateOrCreate(['id' => $row['id']], $row);
            }

            foreach ($snapshot['usage_events'] ?? [] as $row) {
                UsageEvent::query()->updateOrCreate(['id' => $row['id']], $row);
            }
        });
    }
}
