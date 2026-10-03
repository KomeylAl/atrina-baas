<?php

namespace App\Services\Data;

use App\Enums\ApiCredentialKind;
use App\Enums\DataPolicyOperation;
use App\Enums\DataPolicySubject;
use App\Models\ApiCredential;
use App\Models\DataPolicy;
use App\Models\DataRecord;
use App\Models\DataTable;
use App\Models\ProjectUser;
use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class DataPolicyEvaluator
{
    public function resolveSubject(?ApiCredential $credential, ?ProjectUser $user): DataPolicySubject
    {
        if ($credential !== null && in_array($credential->kind, [ApiCredentialKind::ServerSecret, ApiCredentialKind::Admin], true)) {
            return DataPolicySubject::Service;
        }

        if ($user instanceof ProjectUser) {
            return DataPolicySubject::Authenticated;
        }

        return DataPolicySubject::Anonymous;
    }

    public function authorize(
        DataTable $table,
        DataPolicyOperation $operation,
        DataPolicySubject $subject,
        ?ProjectUser $user = null,
        ?DataRecord $record = null,
    ): DataPolicy {
        $policy = DataPolicy::query()
            ->where('data_table_id', $table->id)
            ->where('operation', $operation)
            ->where('subject', $subject)
            ->where('enabled', true)
            ->first();

        if ($policy === null) {
            throw new AccessDeniedHttpException('No policy allows this operation.');
        }

        $definition = $policy->policy_definition ?? [];

        if (($definition['owner_only'] ?? false) === true) {
            if ($operation === DataPolicyOperation::Insert) {
                if ($user === null) {
                    throw new AccessDeniedHttpException('Authentication is required for owner-scoped writes.');
                }
            } elseif (in_array($operation, [DataPolicyOperation::Update, DataPolicyOperation::Delete, DataPolicyOperation::Select], true) && $record !== null) {
                if ($user === null || $record->owner_id !== $user->id) {
                    throw new AccessDeniedHttpException('You do not have access to this record.');
                }
            }
        }

        return $policy;
    }

    /**
     * @param  Builder<DataRecord>  $query
     * @return Builder<DataRecord>
     */
    public function applyListConstraints(
        Builder $query,
        DataPolicy $policy,
        ?ProjectUser $user,
    ): Builder {
        $definition = $policy->policy_definition ?? [];

        if (($definition['owner_only'] ?? false) === true) {
            if ($user === null) {
                throw new AccessDeniedHttpException('Authentication is required for owner-scoped reads.');
            }

            $query->where('owner_id', $user->id);
        }

        return $query;
    }
}
