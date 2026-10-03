<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\DataPlane\StoreDataRecordRequest;
use App\Http\Requests\DataPlane\UpdateDataRecordRequest;
use App\Http\Resources\DataRecordResource;
use App\Models\ApiCredential;
use App\Models\Environment;
use App\Models\ProjectUser;
use App\Services\Data\DataRecordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DataRecordController extends Controller
{
    public function __construct(private readonly DataRecordService $dataRecordService) {}

    public function index(Request $request, string $table): AnonymousResourceCollection
    {
        [$environment, $credential, $user] = $this->context($request);

        $records = $this->dataRecordService->list(
            environment: $environment,
            tableName: $table,
            credential: $credential,
            user: $user,
            page: (int) $request->integer('page', 1),
            perPage: (int) $request->integer('per_page', 25),
            orderBy: $request->input('order_by'),
            order: (string) $request->input('order', 'desc'),
        );

        return DataRecordResource::collection($records);
    }

    public function store(StoreDataRecordRequest $request, string $table): JsonResponse
    {
        [$environment, $credential, $user] = $this->context($request);

        $record = $this->dataRecordService->create(
            environment: $environment,
            tableName: $table,
            payload: $request->input('data', []),
            credential: $credential,
            user: $user,
        );

        return (new DataRecordResource($record))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $table, string $recordId): DataRecordResource
    {
        [$environment, $credential, $user] = $this->context($request);

        $record = $this->dataRecordService->find(
            environment: $environment,
            tableName: $table,
            recordId: $recordId,
            credential: $credential,
            user: $user,
        );

        return new DataRecordResource($record);
    }

    public function update(
        UpdateDataRecordRequest $request,
        string $table,
        string $recordId,
    ): DataRecordResource {
        [$environment, $credential, $user] = $this->context($request);

        $record = $this->dataRecordService->update(
            environment: $environment,
            tableName: $table,
            recordId: $recordId,
            payload: $request->input('data', []),
            credential: $credential,
            user: $user,
        );

        return new DataRecordResource($record);
    }

    public function destroy(Request $request, string $table, string $recordId): JsonResponse
    {
        [$environment, $credential, $user] = $this->context($request);

        $this->dataRecordService->delete(
            environment: $environment,
            tableName: $table,
            recordId: $recordId,
            credential: $credential,
            user: $user,
        );

        return response()->json(['message' => 'Deleted.']);
    }

    /**
     * @return array{0: Environment, 1: ApiCredential, 2: ?ProjectUser}
     */
    private function context(Request $request): array
    {
        /** @var Environment $environment */
        $environment = $request->attributes->get('projectEnvironment');
        /** @var ApiCredential $credential */
        $credential = $request->attributes->get('apiCredential');
        $user = $request->user();
        $projectUser = $user instanceof ProjectUser ? $user : null;

        return [$environment, $credential, $projectUser];
    }
}
