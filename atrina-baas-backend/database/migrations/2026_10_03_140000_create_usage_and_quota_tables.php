<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usage_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->string('metric');
            $table->unsignedBigInteger('quantity')->default(1);
            $table->string('unit')->default('count');
            $table->string('source')->default('api');
            $table->string('idempotency_key')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['environment_id', 'metric', 'occurred_at']);
            $table->index(['project_id', 'occurred_at']);
            $table->unique(['environment_id', 'idempotency_key'], 'usage_events_env_idempotency_unique');
        });

        Schema::create('environment_quotas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->string('metric');
            $table->unsignedBigInteger('soft_limit')->nullable();
            $table->unsignedBigInteger('hard_limit')->nullable();
            $table->unsignedInteger('window_seconds')->default(2_592_000);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['environment_id', 'metric']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environment_quotas');
        Schema::dropIfExists('usage_events');
    }
};
