<?php

namespace App\Services\Data;

use App\Enums\DataPolicyOperation;
use App\Enums\DataTableStatus;
use App\Models\ApiCredential;
use App\Models\DataRecord;
use App\Models\DataTable;
use App\Models\Environment;
use App\Models\ProjectUser;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DataRecordService
{
    public function __construct(
        private readonly SchemaValidator $schemaValidator,
        private readonly DataPolicyEvaluator $policyEvaluator,
    ) {}

    public function resolveTable(Environment $environment, string $tableName): DataTable
    {
        $table = DataTable::query()
            ->where('environment_id', $environment->id)
            ->where('name', $tableName)
            ->where('status', DataTableStatus::Active)
            ->first();

        if ($table === null) {
            throw new NotFoundHttpException('Data table not found.');
        }

        return $table;
    }

    public function list(
        Environment $environment,
        string $tableName,
        ?ApiCredential $credential,
        ?ProjectUser $user,
        int $page = 1,
        int $perPage = 25,
        ?string $orderBy = null,
        string $order = 'desc',
    ): LengthAwarePaginator {
        $table = $this->resolveTable($environment, $tableName);
        $subject = $this->policyEvaluator->resolveSubject($credential, $user);
        $policy = $this->policyEvaluator->authorize($table, DataPolicyOperation::Select, $subject, $user);

        $perPage = max(1, min($perPage, 100));
        $page = max(1, $page);

        $query = DataRecord::query()
            ->where('data_table_id', $table->id)
            ->where('environment_id', $environment->id);

        $this->policyEvaluator->applyListConstraints($query, $policy, $user);

        $allowedOrder = ['created_at', 'updated_at', 'id'];
        $orderBy = in_array($orderBy, $allowedOrder, true) ? $orderBy : 'created_at';
        $order = strtolower($order) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($orderBy, $order)->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(
        Environment $environment,
        string $tableName,
        array $payload,
        ?ApiCredential $credential,
        ?ProjectUser $user,
    ): DataRecord {
        $table = $this->resolveTable($environment, $tableName);
        $subject = $this->policyEvaluator->resolveSubject($credential, $user);
        $policy = $this->policyEvaluator->authorize($table, DataPolicyOperation::Insert, $subject, $user);

        $data = $this->schemaValidator->validatePayload($table->schema_definition, $payload);
        $definition = $policy->policy_definition ?? [];
        $ownerId = null;

        if (($definition['owner_only'] ?? false) === true || $user !== null) {
            $ownerId = $user?->id;
        }

        return DataRecord::query()->create([
            'project_id' => $environment->project_id,
            'environment_id' => $environment->id,
            'data_table_id' => $table->id,
            'owner_id' => $ownerId,
            'data' => $data,
        ]);
    }

    public function find(
        Environment $environment,
        string $tableName,
        string $recordId,
        ?ApiCredential $credential,
        ?ProjectUser $user,
    ): DataRecord {
        $table = $this->resolveTable($environment, $tableName);
        $record = $this->findRecord($table, $environment, $recordId);
        $subject = $this->policyEvaluator->resolveSubject($credential, $user);
        $this->policyEvaluator->authorize($table, DataPolicyOperation::Select, $subject, $user, $record);

        return $record;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function update(
        Environment $environment,
        string $tableName,
        string $recordId,
        array $payload,
        ?ApiCredential $credential,
        ?ProjectUser $user,
    ): DataRecord {
        $table = $this->resolveTable($environment, $tableName);
        $record = $this->findRecord($table, $environment, $recordId);
        $subject = $this->policyEvaluator->resolveSubject($credential, $user);
        $this->policyEvaluator->authorize($table, DataPolicyOperation::Update, $subject, $user, $record);

        if ($payload === []) {
            throw ValidationException::withMessages([
                'data' => ['At least one field is required.'],
            ]);
        }

        $patch = $this->schemaValidator->validatePayload($table->schema_definition, $payload, partial: true);
        $record->forceFill([
            'data' => array_merge($record->data ?? [], $patch),
        ])->save();

        return $record->refresh();
    }

    public function delete(
        Environment $environment,
        string $tableName,
        string $recordId,
        ?ApiCredential $credential,
        ?ProjectUser $user,
    ): void {
        $table = $this->resolveTable($environment, $tableName);
        $record = $this->findRecord($table, $environment, $recordId);
        $subject = $this->policyEvaluator->resolveSubject($credential, $user);
        $this->policyEvaluator->authorize($table, DataPolicyOperation::Delete, $subject, $user, $record);
        $record->delete();
    }

    private function findRecord(DataTable $table, Environment $environment, string $recordId): DataRecord
    {
        $record = DataRecord::query()
            ->where('id', $recordId)
            ->where('data_table_id', $table->id)
            ->where('environment_id', $environment->id)
            ->first();

        if ($record === null) {
            throw new NotFoundHttpException('Record not found.');
        }

        return $record;
    }
}
