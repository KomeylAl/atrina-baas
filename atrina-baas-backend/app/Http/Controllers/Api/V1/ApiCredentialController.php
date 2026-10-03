<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ApiCredentialKind;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApiCredentialRequest;
use App\Http\Resources\ApiCredentialResource;
use App\Models\ApiCredential;
use App\Models\Environment;
use App\Services\ApiCredentialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApiCredentialController extends Controller
{
    public function __construct(private readonly ApiCredentialService $credentialService) {}

    public function index(Environment $environment): AnonymousResourceCollection
    {
        $this->authorize('view', $environment);

        $credentials = $environment->credentials()
            ->orderByDesc('created_at')
            ->get();

        return ApiCredentialResource::collection($credentials);
    }

    public function store(StoreApiCredentialRequest $request, Environment $environment): JsonResponse
    {
        $this->authorize('manageCredentials', $environment);

        $result = $this->credentialService->create(
            environment: $environment,
            actor: $request->user(),
            name: $request->string('name')->toString(),
            kind: ApiCredentialKind::from($request->string('kind')->toString()),
            scopes: $request->input('scopes'),
            expiresAt: $request->date('expires_at'),
        );

        return (new ApiCredentialResource($result['credential']))
            ->withPlainSecret($result['secret'])
            ->response()
            ->setStatusCode(201);
    }

    public function revoke(Request $request, ApiCredential $credential): ApiCredentialResource
    {
        $this->authorize('revoke', $credential);

        $credential = $this->credentialService->revoke($credential, $request->user());

        return new ApiCredentialResource($credential);
    }

    public function rotate(Request $request, ApiCredential $credential): JsonResponse
    {
        $this->authorize('rotate', $credential);

        $result = $this->credentialService->rotate($credential, $request->user());

        return (new ApiCredentialResource($result['credential']))
            ->withPlainSecret($result['secret'])
            ->response()
            ->setStatusCode(200);
    }
}
