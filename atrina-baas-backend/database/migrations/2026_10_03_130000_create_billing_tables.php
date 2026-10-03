<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_providers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->string('provider');
            $table->string('display_name');
            $table->string('status')->default('active');
            $table->text('configuration_encrypted');
            $table->timestamps();

            $table->unique(['environment_id', 'provider']);
        });

        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['project_id', 'code']);
        });

        Schema::create('plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('billing_period_unit');
            $table->unsignedInteger('billing_period_count')->default(1);
            $table->unsignedBigInteger('price')->default(0);
            $table->string('currency', 3)->default('IRR');
            $table->string('status')->default('active');
            $table->json('features')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'code']);
        });

        Schema::create('provider_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('plan_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->string('provider');
            $table->string('store_product_id');
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['environment_id', 'provider', 'store_product_id'], 'provider_products_env_provider_sku_unique');
        });

        Schema::create('entitlements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('value_type')->default('boolean');
            $table->timestamps();

            $table->unique(['project_id', 'code']);
        });

        Schema::create('plan_entitlements', function (Blueprint $table) {
            $table->foreignUuid('plan_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('entitlement_id')->constrained()->cascadeOnDelete();
            $table->json('value')->nullable();
            $table->primary(['plan_id', 'entitlement_id']);
        });

        Schema::create('purchases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('plan_id')->constrained()->restrictOnDelete();
            $table->string('provider');
            $table->string('provider_transaction_id')->nullable();
            $table->text('provider_purchase_token_encrypted')->nullable();
            $table->string('provider_purchase_token_hash');
            $table->string('provider_product_id');
            $table->string('status')->default('pending');
            $table->unsignedBigInteger('amount')->nullable();
            $table->string('currency', 3)->nullable();
            $table->timestamp('purchased_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->json('raw_provider_payload')->nullable();
            $table->string('idempotency_key')->nullable();
            $table->timestamps();

            $table->unique(
                ['environment_id', 'provider', 'provider_purchase_token_hash'],
                'purchases_env_provider_token_unique',
            );
            $table->index(['project_user_id', 'status']);
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('plan_id')->constrained()->restrictOnDelete();
            $table->string('provider');
            $table->string('status')->default('pending');
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->string('provider_subscription_id')->nullable();
            $table->timestamps();

            $table->index(['project_user_id', 'status']);
            $table->index(['environment_id', 'current_period_end']);
        });

        Schema::create('subscription_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('subscription_id')->constrained()->cascadeOnDelete();
            $table->string('event_type');
            $table->string('source');
            $table->string('idempotency_key')->nullable();
            $table->json('payload_redacted')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['subscription_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_events');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('plan_entitlements');
        Schema::dropIfExists('entitlements');
        Schema::dropIfExists('provider_products');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('products');
        Schema::dropIfExists('billing_providers');
    }
};
