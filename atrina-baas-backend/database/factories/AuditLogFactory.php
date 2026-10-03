<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'project_id' => null,
            'environment_id' => null,
            'actor_type' => 'platform_user',
            'actor_id' => User::factory(),
            'action' => 'organization.created',
            'resource_type' => 'organization',
            'resource_id' => null,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'metadata_redacted' => [],
            'created_at' => now(),
        ];
    }
}
