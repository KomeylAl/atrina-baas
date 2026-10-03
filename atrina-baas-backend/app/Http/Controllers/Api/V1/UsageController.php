<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Environment;
use App\Models\EnvironmentQuota;
use App\Models\Project;
use App\Services\Usage\UsageRecorder;
use App\Support\OrganizationAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UsageController extends Controller
{
    public function __construct(
        private readonly UsageRecorder $usageRecorder,
        private readonly OrganizationAccess $access,
    ) {}

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewUsage', $project);

        $data = $request->validate([
            'environment_id' => ['sometimes', 'nullable', 'uuid', 'exists:environments,id'],
            'from' => ['sometimes', 'nullable', 'date'],
            'to' => ['sometimes', 'nullable', 'date', 'after_or_equal:from'],
        ]);

        $environmentId = $data['environment_id'] ?? null;
        if ($environmentId !== null) {
            $environment = Environment::query()->findOrFail($environmentId);
            abort_unless($environment->project_id === $project->id, 422);
        }

        $from = isset($data['from']) ? CarbonImmutable::parse($data['from']) : now()->subDays(30)->toImmutable();
        $to = isset($data['to']) ? CarbonImmutable::parse($data['to']) : now()->toImmutable();

        $metrics = $this->usageRecorder->aggregate(
            projectId: $project->id,
            environmentId: $environmentId,
            from: $from,
            to: $to,
        );

        $quotas = EnvironmentQuota::query()
            ->whereIn('environment_id', $project->environments()->pluck('id'))
            ->when($environmentId, fn ($q) => $q->where('environment_id', $environmentId))
            ->where('status', 'active')
            ->get()
            ->map(fn (EnvironmentQuota $quota) => [
                'environment_id' => $quota->environment_id,
                'metric' => $quota->metric,
                'soft_limit' => $quota->soft_limit,
                'hard_limit' => $quota->hard_limit,
                'window_seconds' => $quota->window_seconds,
            ])
            ->values();

        return response()->json([
            'project_id' => $project->id,
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
            'metrics' => $metrics,
            'quotas' => $quotas,
            'counting_rules' => 'See ADR-008-usage-metrics.md',
        ]);
    }

    public function upsertQuota(Request $request, Environment $environment): JsonResponse
    {
        $environment->loadMissing('project');
        $role = $this->access->forProject($request->user(), $environment->project)?->role;
        abort_unless($role !== null && $role->canWriteProjects(), 403);

        $data = $request->validate([
            'metric' => ['required', 'string', Rule::in([
                'api_requests',
                'data_reads',
                'data_writes',
                'auth_signins',
                'billing_verifications',
            ])],
            'soft_limit' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'hard_limit' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'window_seconds' => ['sometimes', 'integer', 'min:60', 'max:31536000'],
            'status' => ['sometimes', Rule::in(['active', 'disabled'])],
        ]);

        if (
            isset($data['soft_limit'], $data['hard_limit'])
            && $data['soft_limit'] !== null
            && $data['hard_limit'] !== null
            && $data['soft_limit'] > $data['hard_limit']
        ) {
            return response()->json([
                'message' => 'soft_limit cannot exceed hard_limit.',
            ], 422);
        }

        $quota = EnvironmentQuota::query()->updateOrCreate(
            [
                'environment_id' => $environment->id,
                'metric' => $data['metric'],
            ],
            [
                'soft_limit' => $data['soft_limit'] ?? null,
                'hard_limit' => $data['hard_limit'] ?? null,
                'window_seconds' => $data['window_seconds'] ?? 2_592_000,
                'status' => $data['status'] ?? 'active',
            ],
        );

        return response()->json(['data' => $quota], 201);
    }
}
