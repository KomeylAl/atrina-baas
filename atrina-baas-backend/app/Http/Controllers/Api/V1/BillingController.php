<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\BillingProviderName;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\VerifyPurchaseRequest;
use App\Http\Resources\PlanResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\PurchaseResource;
use App\Http\Resources\SubscriptionResource;
use App\Models\Environment;
use App\Models\Product;
use App\Models\ProjectUser;
use App\Models\Purchase;
use App\Models\Subscription;
use App\Services\Billing\EntitlementResolver;
use App\Services\Billing\PurchaseVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BillingController extends Controller
{
    public function __construct(
        private readonly PurchaseVerificationService $verificationService,
        private readonly EntitlementResolver $entitlementResolver,
    ) {}

    public function products(Request $request): AnonymousResourceCollection
    {
        $environment = $this->environment($request);

        $products = Product::query()
            ->where('project_id', $environment->project_id)
            ->where('status', 'active')
            ->with(['plans' => fn ($q) => $q->where('status', 'active')])
            ->orderBy('name')
            ->get();

        return ProductResource::collection($products);
    }

    public function plans(Request $request): AnonymousResourceCollection
    {
        $environment = $this->environment($request);

        $plans = Product::query()
            ->where('project_id', $environment->project_id)
            ->with(['plans' => fn ($q) => $q->where('status', 'active')])
            ->get()
            ->pluck('plans')
            ->flatten();

        return PlanResource::collection($plans);
    }

    public function verify(VerifyPurchaseRequest $request): JsonResponse
    {
        $environment = $this->environment($request);
        $user = $this->projectUser($request);

        $result = $this->verificationService->verify(
            environment: $environment,
            user: $user,
            providerName: BillingProviderName::from($request->string('provider')->toString()),
            storeProductId: $request->string('store_product_id')->toString(),
            purchaseToken: $request->string('purchase_token')->toString(),
            idempotencyKey: $request->input('idempotency_key'),
        );

        return response()->json([
            'replayed' => $result['replayed'],
            'purchase' => (new PurchaseResource($result['purchase']))->resolve(),
            'subscription' => (new SubscriptionResource($result['subscription']))->resolve(),
        ], $result['replayed'] ? 200 : 201);
    }

    public function purchases(Request $request): AnonymousResourceCollection
    {
        $environment = $this->environment($request);
        $user = $this->projectUser($request);

        $purchases = Purchase::query()
            ->where('environment_id', $environment->id)
            ->where('project_user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(25);

        return PurchaseResource::collection($purchases);
    }

    public function subscriptions(Request $request): AnonymousResourceCollection
    {
        $environment = $this->environment($request);
        $user = $this->projectUser($request);

        $subscriptions = Subscription::query()
            ->where('environment_id', $environment->id)
            ->where('project_user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return SubscriptionResource::collection($subscriptions);
    }

    public function showSubscription(Request $request, string $subscriptionId): SubscriptionResource
    {
        $environment = $this->environment($request);
        $user = $this->projectUser($request);

        $subscription = Subscription::query()
            ->where('id', $subscriptionId)
            ->where('environment_id', $environment->id)
            ->where('project_user_id', $user->id)
            ->firstOrFail();

        return new SubscriptionResource($subscription);
    }

    public function entitlements(Request $request): JsonResponse
    {
        $environment = $this->environment($request);
        $user = $this->projectUser($request);

        return response()->json([
            'data' => $this->entitlementResolver->forUser($environment, $user),
        ]);
    }

    private function environment(Request $request): Environment
    {
        /** @var Environment $environment */
        $environment = $request->attributes->get('projectEnvironment');

        return $environment;
    }

    private function projectUser(Request $request): ProjectUser
    {
        $user = $request->user();
        abort_unless($user instanceof ProjectUser && $user->isActive(), 403);

        return $user;
    }
}
