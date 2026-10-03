<?php

namespace App\Services\Data;

use App\Enums\DataPolicyOperation;
use App\Enums\DataPolicySubject;
use App\Enums\DataTableStatus;
use App\Models\DataPolicy;
use App\Models\DataTable;
use App\Models\Environment;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DataTableService
{
    public function __construct(
        private readonly SchemaValidator $schemaValidator,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $schemaDefinition
     * @param  list<array<string, mixed>>|null  $policies
     */
    public function create(
        Environment $environment,
        User $actor,
        string $name,
        ?string $displayName,
        array $schemaDefinition,
        ?array $policies = null,
    ): DataTable {
        $name = Str::lower($name);

        if (! preg_match('/^[a-z][a-z0-9_]{1,62}$/', $name)) {
            throw ValidationException::withMessages([
                'name' => ['Use a lowercase slug like notes or todo_items.'],
            ]);
        }

        $schema = $this->schemaValidator->normalizeSchemaDefinition($schemaDefinition);

        $environment->loadMissing('project');

        return DB::transaction(function () use ($environment, $actor, $name, $displayName, $schema, $policies) {
            $table = DataTable::query()->create([
                'project_id' => $environment->project_id,
                'environment_id' => $environment->id,
                'name' => $name,
                'display_name' => $displayName,
                'schema_definition' => $schema,
                'status' => DataTableStatus::Active,
            ]);

            foreach ($policies ?? $this->defaultPolicies() as $policy) {
                DataPolicy::query()->create([
                    'data_table_id' => $table->id,
                    'operation' => $policy['operation'],
                    'subject' => $policy['subject'],
                    'policy_definition' => $policy['policy_definition'] ?? [],
                    'enabled' => $policy['enabled'] ?? true,
                ]);
            }

            $this->auditLogger->record(
                action: 'data_table.created',
                resourceType: 'data_table',
                resourceId: $table->id,
                actor: $actor,
                organizationId: $environment->project->organization_id,
                projectId: $environment->project_id,
                environmentId: $environment->id,
                metadata: ['name' => $name],
            );

            return $table->load('policies');
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(DataTable $table, User $actor, array $attributes): DataTable
    {
        if (array_key_exists('schema_definition', $attributes)) {
            $attributes['schema_definition'] = $this->schemaValidator->normalizeSchemaDefinition(
                $attributes['schema_definition'],
            );
        }

        $table->fill(collect($attributes)->only(['display_name', 'schema_definition', 'status'])->all());
        $table->save();

        $this->auditLogger->record(
            action: 'data_table.updated',
            resourceType: 'data_table',
            resourceId: $table->id,
            actor: $actor,
            organizationId: $table->project->organization_id,
            projectId: $table->project_id,
            environmentId: $table->environment_id,
            metadata: ['changes' => array_keys($table->getChanges())],
        );

        return $table->refresh()->load('policies');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function upsertPolicy(DataTable $table, User $actor, array $attributes): DataPolicy
    {
        $policy = DataPolicy::query()->updateOrCreate(
            [
                'data_table_id' => $table->id,
                'operation' => $attributes['operation'],
                'subject' => $attributes['subject'],
            ],
            [
                'policy_definition' => $attributes['policy_definition'] ?? [],
                'enabled' => $attributes['enabled'] ?? true,
            ],
        );

        $this->auditLogger->record(
            action: 'data_policy.upserted',
            resourceType: 'data_policy',
            resourceId: $policy->id,
            actor: $actor,
            organizationId: $table->project->organization_id,
            projectId: $table->project_id,
            environmentId: $table->environment_id,
            metadata: [
                'operation' => $policy->operation->value,
                'subject' => $policy->subject->value,
            ],
        );

        return $policy;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function defaultPolicies(): array
    {
        return [
            [
                'operation' => DataPolicyOperation::Select,
                'subject' => DataPolicySubject::Authenticated,
                'policy_definition' => ['owner_only' => true],
            ],
            [
                'operation' => DataPolicyOperation::Insert,
                'subject' => DataPolicySubject::Authenticated,
                'policy_definition' => ['owner_only' => true],
            ],
            [
                'operation' => DataPolicyOperation::Update,
                'subject' => DataPolicySubject::Authenticated,
                'policy_definition' => ['owner_only' => true],
            ],
            [
                'operation' => DataPolicyOperation::Delete,
                'subject' => DataPolicySubject::Authenticated,
                'policy_definition' => ['owner_only' => true],
            ],
            [
                'operation' => DataPolicyOperation::Select,
                'subject' => DataPolicySubject::Service,
                'policy_definition' => [],
            ],
            [
                'operation' => DataPolicyOperation::Insert,
                'subject' => DataPolicySubject::Service,
                'policy_definition' => [],
            ],
            [
                'operation' => DataPolicyOperation::Update,
                'subject' => DataPolicySubject::Service,
                'policy_definition' => [],
            ],
            [
                'operation' => DataPolicyOperation::Delete,
                'subject' => DataPolicySubject::Service,
                'policy_definition' => [],
            ],
        ];
    }
}
