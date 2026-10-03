<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuditLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        string $action,
        string $resourceType,
        ?string $resourceId = null,
        ?User $actor = null,
        ?string $organizationId = null,
        ?string $projectId = null,
        ?string $environmentId = null,
        array $metadata = [],
        ?Request $request = null,
    ): AuditLog {
        $request ??= request();

        return AuditLog::query()->create([
            'id' => (string) Str::uuid7(),
            'organization_id' => $organizationId,
            'project_id' => $projectId,
            'environment_id' => $environmentId,
            'actor_type' => $actor ? 'platform_user' : 'system',
            'actor_id' => $actor?->id,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'ip_address' => $request?->ip(),
            'user_agent' => Str::limit((string) $request?->userAgent(), 512, ''),
            'metadata_redacted' => $this->redact($metadata),
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    private function redact(array $metadata): array
    {
        $blocked = ['password', 'secret', 'token', 'otp', 'authorization', 'secret_hash'];

        foreach ($metadata as $key => $value) {
            if (is_string($key) && Str::contains(Str::lower($key), $blocked)) {
                $metadata[$key] = '[redacted]';
            }
        }

        return $metadata;
    }
}
