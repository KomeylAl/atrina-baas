<?php

namespace Tests\Feature\Billing;

use App\Enums\ApiCredentialKind;
use App\Enums\BillingPeriodUnit;
use App\Enums\BillingProviderName;
use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Enums\PurchaseStatus;
use App\Enums\SubscriptionStatus;
use App\Models\BillingProvider;
use App\Models\Entitlement;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Project;
use App\Models\ProviderProduct;
use App\Models\Purchase;
use App\Models\Subscription;
use App\Models\User;
use App\Services\ApiCredentialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_purchase_grants_entitlement_once_and_replay_is_idempotent(): void
    {
        [$secret, $environment] = $this->bootstrapBilling();

        $token = $this->signup($secret, 'buyer@example.com');

        $first = $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/billing/purchases/verify', [
            'provider' => BillingProviderName::Fake->value,
            'store_product_id' => 'sku_premium_1m',
            'purchase_token' => 'token-abc-001',
        ]);

        $first->assertCreated()
            ->assertJsonPath('subscription.status', 'active')
            ->assertJsonPath('replayed', false);

        $end = $first->json('subscription.current_period_end');

        $replay = $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/billing/purchases/verify', [
            'provider' => BillingProviderName::Fake->value,
            'store_product_id' => 'sku_premium_1m',
            'purchase_token' => 'token-abc-001',
        ]);

        $replay->assertOk()
            ->assertJsonPath('replayed', true)
            ->assertJsonPath('subscription.current_period_end', $end);

        $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/v1/billing/entitlements')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'premium');
    }

    public function test_forged_purchase_is_rejected(): void
    {
        [$secret] = $this->bootstrapBilling();
        $token = $this->signup($secret, 'buyer2@example.com');

        $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/billing/purchases/verify', [
            'provider' => BillingProviderName::Fake->value,
            'store_product_id' => 'sku_premium_1m',
            'purchase_token' => 'forged-token',
        ])->assertUnprocessable();
    }

    public function test_mismatched_store_product_is_rejected(): void
    {
        [$secret] = $this->bootstrapBilling();
        $token = $this->signup($secret, 'buyer3@example.com');

        $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/billing/purchases/verify', [
            'provider' => BillingProviderName::Fake->value,
            'store_product_id' => 'unknown_sku',
            'purchase_token' => 'token-ok',
        ])->assertUnprocessable();
    }

    public function test_reconcile_expires_ended_subscriptions(): void
    {
        [$secret, $environment] = $this->bootstrapBilling();
        $token = $this->signup($secret, 'buyer4@example.com');

        $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/billing/purchases/verify', [
            'provider' => BillingProviderName::Fake->value,
            'store_product_id' => 'sku_premium_1m',
            'purchase_token' => 'token-expire-me',
        ])->assertCreated();

        $subscription = Subscription::query()->firstOrFail();
        $subscription->forceFill([
            'current_period_end' => now()->subMinute(),
            'status' => SubscriptionStatus::Active,
        ])->save();

        $this->artisan('billing:reconcile-subscriptions')->assertSuccessful();

        $this->assertSame(SubscriptionStatus::Expired, $subscription->refresh()->status);
    }

    public function test_reconcile_revokes_refunded_purchases(): void
    {
        [$secret, $environment] = $this->bootstrapBilling();
        $token = $this->signup($secret, 'buyer5@example.com');
        $purchaseToken = 'token-will-refund';

        $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/v1/billing/purchases/verify', [
            'provider' => BillingProviderName::Fake->value,
            'store_product_id' => 'sku_premium_1m',
            'purchase_token' => $purchaseToken,
        ])->assertCreated();

        $provider = BillingProvider::query()
            ->where('environment_id', $environment->id)
            ->where('provider', BillingProviderName::Fake)
            ->firstOrFail();

        $config = $provider->getConfiguration();
        $config['refunded_token_hashes'] = [hash('sha256', $purchaseToken)];
        $provider->setConfiguration($config);
        $provider->save();

        $this->artisan('billing:reconcile-subscriptions')->assertSuccessful();

        $this->assertSame(SubscriptionStatus::Revoked, Subscription::query()->firstOrFail()->status);
        $this->assertSame(
            PurchaseStatus::Refunded,
            Purchase::query()->firstOrFail()->status,
        );

        $this->withHeaders([
            'X-Atrina-Key' => $secret,
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/v1/billing/entitlements')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /**
     * @return array{0: string, 1: Environment}
     */
    private function bootstrapBilling(): array
    {
        $owner = User::factory()->create();
        $organization = Organization::factory()->create();

        OrganizationMember::factory()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => OrganizationMemberRole::Owner,
            'status' => OrganizationMemberStatus::Active,
        ]);

        $project = Project::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $owner->id,
        ]);

        $environment = Environment::factory()->create([
            'project_id' => $project->id,
        ]);

        $product = Product::query()->create([
            'project_id' => $project->id,
            'code' => 'premium',
            'name' => 'Premium',
            'status' => 'active',
        ]);

        $plan = Plan::query()->create([
            'product_id' => $product->id,
            'code' => 'premium_1m',
            'name' => 'Premium 1 Month',
            'billing_period_unit' => BillingPeriodUnit::Month,
            'billing_period_count' => 1,
            'price' => 99000,
            'currency' => 'IRR',
            'status' => 'active',
        ]);

        $entitlement = Entitlement::query()->create([
            'project_id' => $project->id,
            'code' => 'premium',
            'name' => 'Premium Access',
            'value_type' => 'boolean',
        ]);

        $plan->entitlements()->attach($entitlement->id, ['value' => json_encode(['active' => true])]);

        ProviderProduct::query()->create([
            'plan_id' => $plan->id,
            'environment_id' => $environment->id,
            'provider' => BillingProviderName::Fake,
            'store_product_id' => 'sku_premium_1m',
            'status' => 'active',
        ]);

        $billingProvider = new BillingProvider([
            'environment_id' => $environment->id,
            'provider' => BillingProviderName::Fake,
            'display_name' => 'Fake Store',
            'status' => 'active',
        ]);
        $billingProvider->setConfiguration([
            'package_name' => 'com.atrina.demo',
            'access_token' => 'test',
        ]);
        $billingProvider->save();

        $secret = app(ApiCredentialService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'Pub',
            kind: ApiCredentialKind::Publishable,
        )['secret'];

        return [$secret, $environment];
    }

    private function signup(string $secret, string $email): string
    {
        return $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/signup', [
                'email' => $email,
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ])
            ->assertCreated()
            ->json('token');
    }
}
