<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Organization;
use App\Models\Project;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    public function __construct(private readonly ProjectService $projectService) {}

    public function index(Request $request, Organization $organization): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [Project::class, $organization]);

        $projects = Project::query()
            ->where('organization_id', $organization->id)
            ->with('environments')
            ->orderBy('name')
            ->paginate(25);

        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request, Organization $organization): JsonResponse
    {
        $this->authorize('create', [Project::class, $organization]);

        $project = $this->projectService->create(
            organization: $organization,
            actor: $request->user(),
            name: $request->string('name')->toString(),
            slug: $request->input('slug'),
            description: $request->input('description'),
        );

        return (new ProjectResource($project))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project): ProjectResource
    {
        $this->authorize('view', $project);

        $project->load('environments');

        return new ProjectResource($project);
    }

    public function update(UpdateProjectRequest $request, Project $project): ProjectResource
    {
        $this->authorize('update', $project);

        $project = $this->projectService->update(
            project: $project,
            actor: $request->user(),
            attributes: $request->validated(),
        );

        $project->load('environments');

        return new ProjectResource($project);
    }

    public function archive(Request $request, Project $project): ProjectResource
    {
        $this->authorize('archive', $project);

        $project = $this->projectService->archive($project, $request->user());
        $project->load('environments');

        return new ProjectResource($project);
    }
}
