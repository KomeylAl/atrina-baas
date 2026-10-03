<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrganizationRequest;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationResource;
use App\Models\Organization;
use App\Services\OrganizationService;
use App\Support\OrganizationAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrganizationController extends Controller
{
    public function __construct(
        private readonly OrganizationService $organizationService,
        private readonly OrganizationAccess $access,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Organization::class);

        $organizations = Organization::query()
            ->whereHas('members', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id)
                    ->where('status', 'active');
            })
            ->with(['members' => fn ($query) => $query->where('user_id', $request->user()->id)])
            ->orderBy('name')
            ->paginate(25);

        $organizations->getCollection()->transform(function (Organization $organization) {
            $organization->membership_role = $organization->members->first()?->role?->value;

            return $organization;
        });

        return OrganizationResource::collection($organizations);
    }

    public function store(StoreOrganizationRequest $request): JsonResponse
    {
        $this->authorize('create', Organization::class);

        $organization = $this->organizationService->create(
            owner: $request->user(),
            name: $request->string('name')->toString(),
            slug: $request->input('slug'),
        );

        $organization->membership_role = 'owner';

        return (new OrganizationResource($organization))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Organization $organization): OrganizationResource
    {
        $this->authorize('view', $organization);

        $organization->membership_role = $this->access->role($request->user(), $organization)?->value;

        return new OrganizationResource($organization);
    }

    public function update(UpdateOrganizationRequest $request, Organization $organization): OrganizationResource
    {
        $this->authorize('update', $organization);

        $organization = $this->organizationService->update(
            organization: $organization,
            actor: $request->user(),
            attributes: $request->validated(),
        );

        $organization->membership_role = $this->access->role($request->user(), $organization)?->value;

        return new OrganizationResource($organization);
    }
}
