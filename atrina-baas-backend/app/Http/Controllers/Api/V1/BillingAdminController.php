<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\BillingPeriodUnit;
use App\Enums\BillingProviderName;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlanResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\PurchaseResource;
use App\Http\Resources\SubscriptionResource;
use App\Models\BillingProvider;
use App\Models\Entitlement;
use App\Models\Environment;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Project;
use App\Models\ProviderProduct;
use App\Models\Purchase;
use App\Models\Subscription;
use App\Support\OrganizationAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BillingAdminController extends Controller
{
    public function __construct(private readonly OrganizationAccess $access) {}

    public function catalog(Request $request, Project $project): AnonymousResourceCollection
    {
        $this->authorizeBillingView($request, $project);

        $products = Product::query()
            ->where('project_id', $project->id)
            ->with('plans')
            ->orderBy('name')
            ->get();

        return ProductResource::collection($products);
    }

    public function storeProduct(Request $request, Project $project): JsonResponse
    {
        $this->authorizeBillingManage($request, $project);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:64', 'alpha_dash'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $product = Product::query()->create([
            ...$data,
            'project_id' => $project->id,
            'status' => 'active',
        ]);

        return (new ProductResource($product))->response()->setStatusCode(201);
    }

    public function storePlan(Request $request, Project $project, Product $product): JsonResponse
    {
        $this->authorizeBillingManage($request, $project);
        abort_unless($product->project_id === $project->id, 404);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:64', 'alpha_dash'],
            'name' => ['required', 'string', 'max:120'],
            'billing_period_unit' => ['required', Rule::enum(BillingPeriodUnit::class)],
            'billing_period_count' => ['required', 'integer', 'min:1', 'max:36'],
            'price' => ['required', 'integer', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'entitlement_code' => ['sometimes', 'nullable', 'string', 'max:64'],
            'entitlement_name' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $plan = DB::transaction(function () use ($product, $data, $project) {
            $plan = Plan::query()->create([
                'product_id' => $product->id,
                'code' => $data['code'],
                'name' => $data['name'],
                'billing_period_unit' => $data['billing_period_unit'],
                'billing_period_count' => $data['billing_period_count'],
                'price' => $data['price'],
                'currency' => strtoupper($data['currency']),
                'status' => 'active',
            ]);

            $entitlementCode = $data['entitlement_code'] ?? $data['code'];
            $entitlement = Entitlement::query()->firstOrCreate(
                [
                    'project_id' => $project->id,
                    'code' => $entitlementCode,
                ],
                [
                    'name' => $data['entitlement_name'] ?? $data['name'],
                    'value_type' => 'boolean',
                ],
            );

            $plan->entitlements()->syncWithoutDetaching([
                $entitlement->id => ['value' => ['active' => true]],
            ]);

            return $plan;
        });

        return (new PlanResource($plan))->response()->setStatusCode(201);
    }

    public function mapProviderProduct(Request $request, Project $project, Plan $plan): JsonResponse
    {
        $this->authorizeBillingManage($request, $project);
        abort_unless($plan->product->project_id === $project->id, 404);

        $data = $request->validate([
            'environment_id' => ['required', 'uuid', 'exists:environments,id'],
            'provider' => ['required', Rule::enum(BillingProviderName::class)],
            'store_product_id' => ['required', 'string', 'max:120'],
        ]);

        $environment = Environment::query()->findOrFail($data['environment_id']);
        abort_unless($environment->project_id === $project->id, 422);

        $mapping = ProviderProduct::query()->updateOrCreate(
            [
                'environment_id' => $environment->id,
                'provider' => $data['provider'],
                'store_product_id' => $data['store_product_id'],
            ],
            [
                'plan_id' => $plan->id,
                'status' => 'active',
            ],
        );

        return response()->json(['data' => $mapping], 201);
    }

    public function upsertBillingProvider(Request $request, Environment $environment): JsonResponse
    {
        $environment->loadMissing('project');
        $this->authorizeBillingManage($request, $environment->project);

        $data = $request->validate([
            'provider' => ['required', Rule::enum(BillingProviderName::class)],
            'display_name' => ['required', 'string', 'max:120'],
            'package_name' => ['required', 'string', 'max:190'],
            'access_token' => ['required', 'string', 'max:4096'],
        ]);

        $provider = BillingProvider::query()->firstOrNew([
            'environment_id' => $environment->id,
            'provider' => $data['provider'],
        ]);

        $provider->display_name = $data['display_name'];
        $provider->status = 'active';
        $provider->setConfiguration([
            'package_name' => $data['package_name'],
            'access_token' => $data['access_token'],
        ]);
        $provider->save();

        return response()->json([
            'data' => [
                'id' => $provider->id,
                'provider' => $provider->provider->value,
                'display_name' => $provider->display_name,
                'status' => $provider->status,
                'package_name' => $data['package_name'],
                'has_access_token' => true,
            ],
        ], 201);
    }

    public function purchases(Request $request, Project $project): AnonymousResourceCollection
    {
        $this->authorizeBillingView($request, $project);

        $purchases = Purchase::query()
            ->where('project_id', $project->id)
            ->when($request->filled('environment_id'), fn ($q) => $q->where('environment_id', $request->string('environment_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(25);

        return PurchaseResource::collection($purchases);
    }

    public function subscriptions(Request $request, Project $project): AnonymousResourceCollection
    {
        $this->authorizeBillingView($request, $project);

        $subscriptions = Subscription::query()
            ->where('project_id', $project->id)
            ->when($request->filled('environment_id'), fn ($q) => $q->where('environment_id', $request->string('environment_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(25);

        return SubscriptionResource::collection($subscriptions);
    }

    private function authorizeBillingView(Request $request, Project $project): void
    {
        $role = $this->access->forProject($request->user(), $project)?->role;
        abort_unless($role !== null && $role->canViewBilling(), 403);
    }

    private function authorizeBillingManage(Request $request, Project $project): void
    {
        $role = $this->access->forProject($request->user(), $project)?->role;
        abort_unless($role !== null && $role->canManageBilling(), 403);
    }
}
