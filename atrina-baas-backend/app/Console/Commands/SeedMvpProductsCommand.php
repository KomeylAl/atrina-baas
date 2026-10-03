<?php

namespace App\Console\Commands;

use App\Enums\ApiCredentialKind;
use App\Enums\ApiCredentialStatus;
use App\Enums\BillingPeriodUnit;
use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Enums\PlatformUserStatus;
use App\Models\Entitlement;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Project;
use App\Models\User;
use App\Services\ApiCredentialService;
use App\Services\Data\DataTableService;
use App\Services\ProjectService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SeedMvpProductsCommand extends Command
{
    protected $signature = 'mvp:seed-products
        {--product-a=Product A : First consumer product name}
        {--product-b=Product B : Second consumer product name}
        {--owner-email=owner@atrina.local : Platform owner email}
        {--owner-password=password : Platform owner password (created if missing)}
        {--org=atrina : Organization slug}';

    protected $description = 'Seed two real product projects with keys, a notes table, and a prepaid plan';

    public function handle(
        ProjectService $projectService,
        ApiCredentialService $credentialService,
        DataTableService $dataTableService,
    ): int {
        $ownerEmail = (string) $this->option('owner-email');
        $ownerPassword = (string) $this->option('owner-password');
        $orgSlug = (string) $this->option('org');

        $owner = User::query()->firstOrCreate(
            ['email' => $ownerEmail],
            [
                'name' => 'Atrina Owner',
                'password' => Hash::make($ownerPassword),
                'status' => PlatformUserStatus::Active,
                'email_verified_at' => now(),
            ],
        );

        $organization = Organization::query()->firstOrCreate(
            ['slug' => $orgSlug],
            [
                'name' => Str::headline($orgSlug),
                'status' => 'active',
            ],
        );

        OrganizationMember::query()->firstOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $owner->id,
            ],
            [
                'role' => OrganizationMemberRole::Owner,
                'status' => OrganizationMemberStatus::Active,
            ],
        );

        $products = [
            (string) $this->option('product-a'),
            (string) $this->option('product-b'),
        ];

        $this->info('MVP product seed');
        $this->line('Organization: '.$organization->slug.' ('.$organization->id.')');
        $this->line('Owner login: '.$ownerEmail);

        foreach ($products as $name) {
            $slug = Str::slug($name);
            $project = Project::query()
                ->where('organization_id', $organization->id)
                ->where('slug', $slug)
                ->first();

            if ($project === null) {
                $project = $projectService->create(
                    organization: $organization,
                    actor: $owner,
                    name: $name,
                    slug: $slug,
                    description: 'MVP consumer project seeded for production validation.',
                );
            } else {
                $project->load('environments');
            }

            $production = $project->environments->firstWhere('slug', 'production');
            if ($production === null) {
                $this->error("Project {$slug} is missing a production environment.");

                return self::FAILURE;
            }

            $existingPub = $production->credentials()
                ->where('kind', ApiCredentialKind::Publishable)
                ->where('status', ApiCredentialStatus::Active)
                ->exists();

            $secret = null;
            if (! $existingPub) {
                $created = $credentialService->create(
                    environment: $production,
                    actor: $owner,
                    name: 'MVP Publishable',
                    kind: ApiCredentialKind::Publishable,
                );
                $secret = $created['secret'];
            }

            if (! $production->dataTables()->where('name', 'notes')->exists()) {
                $dataTableService->create(
                    environment: $production,
                    actor: $owner,
                    name: 'notes',
                    displayName: 'Notes',
                    schemaDefinition: [
                        'columns' => [
                            ['name' => 'title', 'type' => 'string', 'required' => true, 'max' => 120],
                            ['name' => 'done', 'type' => 'boolean', 'required' => false, 'default' => false],
                        ],
                    ],
                );
            }

            $this->ensureBillingCatalog($project);

            $this->newLine();
            $this->info("Product: {$project->name}");
            $this->line('  project_id: '.$project->id);
            $this->line('  production_env: '.$production->id);
            if ($secret !== null) {
                $this->warn('  publishable_key (copy now): '.$secret);
            } else {
                $this->line('  publishable_key: already exists (not re-printed)');
            }
        }

        $this->newLine();
        $this->info('Done. Use the publishable keys with packages/sdk-js against APP_URL/api/v1.');

        return self::SUCCESS;
    }

    private function ensureBillingCatalog(Project $project): void
    {
        $product = Product::query()->firstOrCreate(
            [
                'project_id' => $project->id,
                'code' => 'premium',
            ],
            [
                'name' => 'Premium',
                'description' => 'MVP prepaid entitlement',
                'status' => 'active',
            ],
        );

        $plan = Plan::query()->firstOrCreate(
            [
                'product_id' => $product->id,
                'code' => 'premium_1m',
            ],
            [
                'name' => 'Premium 1 Month',
                'billing_period_unit' => BillingPeriodUnit::Month,
                'billing_period_count' => 1,
                'price' => 99000,
                'currency' => 'IRR',
                'status' => 'active',
            ],
        );

        $entitlement = Entitlement::query()->firstOrCreate(
            [
                'project_id' => $project->id,
                'code' => 'premium',
            ],
            [
                'name' => 'Premium Access',
                'value_type' => 'boolean',
            ],
        );

        $plan->entitlements()->syncWithoutDetaching([
            $entitlement->id => ['value' => json_encode(['active' => true])],
        ]);
    }
}
