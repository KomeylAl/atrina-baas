<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDataTableRequest;
use App\Http\Requests\UpdateDataTableRequest;
use App\Http\Requests\UpsertDataPolicyRequest;
use App\Http\Resources\DataPolicyResource;
use App\Http\Resources\DataRecordResource;
use App\Http\Resources\DataTableResource;
use App\Models\DataRecord;
use App\Models\DataTable;
use App\Models\Environment;
use App\Services\Data\DataTableService;
use App\Support\OrganizationAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DataTableController extends Controller
{
    public function __construct(
        private readonly DataTableService $dataTableService,
        private readonly OrganizationAccess $access,
    ) {}

    public function index(Request $request, Environment $environment): AnonymousResourceCollection
    {
        $this->authorizeEnvironment($request, $environment);

        $tables = DataTable::query()
            ->where('environment_id', $environment->id)
            ->with('policies')
            ->orderBy('name')
            ->get();

        return DataTableResource::collection($tables);
    }

    public function store(StoreDataTableRequest $request, Environment $environment): JsonResponse
    {
        $this->authorizeEnvironmentWrite($request, $environment);
        $environment->loadMissing('project');

        $table = $this->dataTableService->create(
            environment: $environment,
            actor: $request->user(),
            name: $request->string('name')->toString(),
            displayName: $request->input('display_name'),
            schemaDefinition: $request->input('schema_definition', []),
            policies: $request->input('policies'),
        );

        return (new DataTableResource($table))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, DataTable $dataTable): DataTableResource
    {
        $dataTable->loadMissing('environment.project', 'policies');
        $this->authorizeEnvironment($request, $dataTable->environment);

        return new DataTableResource($dataTable);
    }

    public function update(UpdateDataTableRequest $request, DataTable $dataTable): DataTableResource
    {
        $dataTable->loadMissing('environment.project', 'project');
        $this->authorizeEnvironmentWrite($request, $dataTable->environment);

        $table = $this->dataTableService->update(
            table: $dataTable,
            actor: $request->user(),
            attributes: $request->validated(),
        );

        return new DataTableResource($table);
    }

    public function upsertPolicy(
        UpsertDataPolicyRequest $request,
        DataTable $dataTable,
    ): DataPolicyResource {
        $dataTable->loadMissing('environment.project', 'project');
        $this->authorizeEnvironmentWrite($request, $dataTable->environment);

        $policy = $this->dataTableService->upsertPolicy(
            table: $dataTable,
            actor: $request->user(),
            attributes: $request->validated(),
        );

        return new DataPolicyResource($policy);
    }

    public function explore(Request $request, DataTable $dataTable): AnonymousResourceCollection
    {
        $dataTable->loadMissing('environment.project');
        $this->authorizeEnvironment($request, $dataTable->environment);

        $perPage = max(1, min((int) $request->integer('per_page', 25), 100));

        $records = DataRecord::query()
            ->where('data_table_id', $dataTable->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return DataRecordResource::collection($records);
    }

    private function authorizeEnvironment(Request $request, Environment $environment): void
    {
        $environment->loadMissing('project');
        abort_unless(
            $this->access->forProject($request->user(), $environment->project) !== null,
            403,
        );
    }

    private function authorizeEnvironmentWrite(Request $request, Environment $environment): void
    {
        $environment->loadMissing('project');
        $role = $this->access->forProject($request->user(), $environment->project)?->role;
        abort_unless($role !== null && $role->canWriteProjects(), 403);
    }
}
