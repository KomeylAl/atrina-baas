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
        Schema::create('data_tables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('display_name')->nullable();
            $table->json('schema_definition');
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['environment_id', 'name']);
            $table->index(['project_id', 'environment_id', 'status']);
        });

        Schema::create('data_policies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('data_table_id')->constrained()->cascadeOnDelete();
            $table->string('operation');
            $table->string('subject');
            $table->json('policy_definition')->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(['data_table_id', 'operation', 'subject'], 'data_policies_table_op_subject_unique');
        });

        Schema::create('data_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('environment_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('data_table_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('owner_id')->nullable()->constrained('project_users')->nullOnDelete();
            $table->json('data');
            $table->timestamps();

            $table->index(['data_table_id', 'created_at']);
            $table->index(['environment_id', 'data_table_id']);
            $table->index(['owner_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_records');
        Schema::dropIfExists('data_policies');
        Schema::dropIfExists('data_tables');
    }
};
