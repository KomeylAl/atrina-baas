<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('project_users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('password')->nullable();
            $table->string('display_name')->nullable();
            $table->string('status')->default('active');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('last_sign_in_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['environment_id', 'email']);
            $table->unique(['environment_id', 'phone']);
            $table->index(['project_id', 'environment_id', 'status']);
        });

        Schema::create('user_identities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->string('provider');
            $table->string('provider_subject');
            $table->timestamps();

            $table->unique(['provider', 'provider_subject', 'environment_id'], 'user_identities_provider_env_unique');
        });

        Schema::create('otp_challenges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->string('channel')->default('sms');
            $table->string('destination');
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts')->default(5);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamp('last_sent_at')->nullable();
            $table->string('provider_message_id')->nullable();
            $table->timestamps();

            $table->index(['environment_id', 'destination', 'consumed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otp_challenges');
        Schema::dropIfExists('user_identities');
        Schema::dropIfExists('project_users');
    }
};
