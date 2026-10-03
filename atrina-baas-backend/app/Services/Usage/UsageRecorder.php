<?php

namespace App\Services\Usage;

use App\Enums\UsageMetric;
use App\Models\Environment;
use App\Models\UsageEvent;
use Illuminate\Support\Facades\DB;
use Throwable;

class UsageRecorder
{
    public function record(
        Environment $environment,
        UsageMetric|string $metric,
        int $quantity = 1,
        string $source = 'api',
        ?string $idempotencyKey = null,
    ): void {
        if ($quantity < 1) {
            return;
        }

        $metricValue = $metric instanceof UsageMetric ? $metric->value : $metric;

        try {
            UsageEvent::query()->create([
                'project_id' => $environment->project_id,
                'environment_id' => $environment->id,
                'metric' => $metricValue,
                'quantity' => $quantity,
                'unit' => 'count',
                'source' => $source,
                'idempotency_key' => $idempotencyKey,
                'occurred_at' => now(),
                'created_at' => now(),
            ]);
        } catch (Throwable $exception) {
            // Unique idempotency collisions are safe no-ops; other failures must not break the request.
            if ($idempotencyKey !== null && $this->isUniqueViolation($exception)) {
                return;
            }

            report($exception);
        }
    }

    /**
     * @return list<array{metric: string, quantity: int, unit: string, environment_id: string|null}>
     */
    public function aggregate(
        string $projectId,
        ?string $environmentId = null,
        ?\DateTimeInterface $from = null,
        ?\DateTimeInterface $to = null,
    ): array {
        $from ??= now()->subDays(30);
        $to ??= now();

        $rows = UsageEvent::query()
            ->select([
                'metric',
                'environment_id',
                'unit',
                DB::raw('SUM(quantity) as quantity'),
            ])
            ->where('project_id', $projectId)
            ->when($environmentId, fn ($q) => $q->where('environment_id', $environmentId))
            ->whereBetween('occurred_at', [$from, $to])
            ->groupBy('metric', 'environment_id', 'unit')
            ->orderBy('metric')
            ->get();

        return $rows->map(fn ($row) => [
            'metric' => (string) $row->metric,
            'quantity' => (int) $row->quantity,
            'unit' => (string) $row->unit,
            'environment_id' => $row->environment_id,
        ])->all();
    }

    public function sumForWindow(Environment $environment, string $metric, int $windowSeconds): int
    {
        return (int) UsageEvent::query()
            ->where('environment_id', $environment->id)
            ->where('metric', $metric)
            ->where('occurred_at', '>=', now()->subSeconds($windowSeconds))
            ->sum('quantity');
    }

    private function isUniqueViolation(Throwable $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'unique') || str_contains($message, 'duplicate');
    }
}
