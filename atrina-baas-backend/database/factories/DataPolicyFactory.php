<?php

namespace Database\Factories;

use App\Enums\DataPolicyOperation;
use App\Enums\DataPolicySubject;
use App\Models\DataPolicy;
use App\Models\DataTable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DataPolicy>
 */
class DataPolicyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'data_table_id' => DataTable::factory(),
            'operation' => DataPolicyOperation::Select,
            'subject' => DataPolicySubject::Authenticated,
            'policy_definition' => ['owner_only' => true],
            'enabled' => true,
        ];
    }
}
