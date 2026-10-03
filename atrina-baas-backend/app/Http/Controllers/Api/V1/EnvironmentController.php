<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EnvironmentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEnvironmentRequest;
use App\Http\Requests\UpdateEnvironmentRequest;
use App\Http\Resources\EnvironmentResource;
use App\Models\Environment;
use App\Models\Project;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EnvironmentController extends Controller
{
    public function __construct(private readonly ProjectService $projectService) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        $this->authorize('view', $project);

        $environments = $project->environments()->orderBy('name')->get();

        return EnvironmentResource::collection($environments);
    }

    public function store(StoreEnvironmentRequest $request, Project $project): JsonResponse
    {
        $this->authorize('manageEnvironments', $project);

        $environment = $this->projectService->createEnvironment(
            project: $project,
            actor: $request->user(),
            name: $request->string('name')->toString(),
            slug: $request->string('slug')->toString(),
            type: EnvironmentType::from($request->string('type')->toString()),
        );

        return (new EnvironmentResource($environment))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateEnvironmentRequest $request, Environment $environment): EnvironmentResource
    {
        $this->authorize('update', $environment);

        $environment = $this->projectService->updateEnvironment(
            environment: $environment,
            actor: $request->user(),
            attributes: $request->validated(),
        );

        return new EnvironmentResource($environment);
    }
}
