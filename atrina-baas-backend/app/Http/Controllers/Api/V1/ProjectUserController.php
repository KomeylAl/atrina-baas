<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ProjectUserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProjectUserRequest;
use App\Http\Resources\ProjectUserResource;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Services\AuditLogger;
use App\Services\Auth\ProjectAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectUserController extends Controller
{
    public function __construct(
        private readonly ProjectAuthService $projectAuthService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $this->authorize('manageUsers', $project);

        $query = ProjectUser::query()
            ->where('project_id', $project->id)
            ->orderByDesc('created_at');

        if ($request->filled('environment_id')) {
            $query->where('environment_id', $request->string('environment_id')->toString());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('q')) {
            $term = '%'.$request->string('q')->toString().'%';
            $query->where(function ($builder) use ($term) {
                $builder->where('email', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('display_name', 'like', $term);
            });
        }

        return ProjectUserResource::collection($query->paginate(25));
    }

    public function show(Project $project, ProjectUser $projectUser): ProjectUserResource
    {
        $this->authorize('manageUsers', $project);
        $this->ensureSameProject($project, $projectUser);

        return new ProjectUserResource($projectUser);
    }

    public function update(
        UpdateProjectUserRequest $request,
        Project $project,
        ProjectUser $projectUser,
    ): ProjectUserResource {
        $this->authorize('manageUsers', $project);
        $this->ensureSameProject($project, $projectUser);

        $projectUser->fill($request->validated());
        $projectUser->save();

        if (($request->input('status') === ProjectUserStatus::Blocked->value)) {
            $this->projectAuthService->revokeAllTokens($projectUser);
        }

        $this->auditLogger->record(
            action: 'project_user.updated',
            resourceType: 'project_user',
            resourceId: $projectUser->id,
            actor: $request->user(),
            organizationId: $project->organization_id,
            projectId: $project->id,
            environmentId: $projectUser->environment_id,
            metadata: [
                'changes' => array_keys($projectUser->getChanges()),
            ],
        );

        return new ProjectUserResource($projectUser->refresh());
    }

    public function revokeSessions(
        Request $request,
        Project $project,
        ProjectUser $projectUser,
    ): JsonResponse {
        $this->authorize('manageUsers', $project);
        $this->ensureSameProject($project, $projectUser);

        $this->projectAuthService->revokeAllTokens($projectUser);

        $this->auditLogger->record(
            action: 'project_user.sessions_revoked',
            resourceType: 'project_user',
            resourceId: $projectUser->id,
            actor: $request->user(),
            organizationId: $project->organization_id,
            projectId: $project->id,
            environmentId: $projectUser->environment_id,
        );

        return response()->json(['message' => 'Sessions revoked.']);
    }

    private function ensureSameProject(Project $project, ProjectUser $projectUser): void
    {
        abort_unless($projectUser->project_id === $project->id, 404);
    }
}
