<?php

namespace App\Services;

use App\Enums\ApiCredentialKind;
use App\Enums\ApiCredentialStatus;
use App\Models\ApiCredential;
use App\Models\Environment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApiCredentialService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @param  list<string>|null  $scopes
     * @return array{credential: ApiCredential, secret: string}
     */
    public function create(
        Environment $environment,
        User $actor,
        string $name,
        ApiCredentialKind $kind,
        ?array $scopes = null,
        ?\DateTimeInterface $expiresAt = null,
    ): array {
        $secret = $this->generateSecret($kind);
        $prefix = substr($secret, 0, 12);

        $credential = ApiCredential::query()->create([
            'environment_id' => $environment->id,
            'name' => $name,
            'key_prefix' => $prefix,
            'secret_hash' => hash('sha256', $secret),
            'kind' => $kind,
            'scopes' => $scopes ?? [],
            'status' => ApiCredentialStatus::Active,
            'expires_at' => $expiresAt,
            'created_by' => $actor->id,
        ]);

        $project = $environment->project;

        $this->auditLogger->record(
            action: 'credential.created',
            resourceType: 'api_credential',
            resourceId: $credential->id,
            actor: $actor,
            organizationId: $project->organization_id,
            projectId: $project->id,
            environmentId: $environment->id,
            metadata: [
                'name' => $name,
                'kind' => $kind->value,
                'key_prefix' => $prefix,
            ],
        );

        return ['credential' => $credential, 'secret' => $secret];
    }

    public function revoke(ApiCredential $credential, User $actor): ApiCredential
    {
        if ($credential->status === ApiCredentialStatus::Revoked) {
            return $credential;
        }

        $credential->forceFill([
            'status' => ApiCredentialStatus::Revoked,
            'revoked_at' => now(),
        ])->save();

        $environment = $credential->environment()->with('project')->firstOrFail();
        $project = $environment->project;

        $this->auditLogger->record(
            action: 'credential.revoked',
            resourceType: 'api_credential',
            resourceId: $credential->id,
            actor: $actor,
            organizationId: $project->organization_id,
            projectId: $project->id,
            environmentId: $environment->id,
            metadata: [
                'key_prefix' => $credential->key_prefix,
            ],
        );

        return $credential->refresh();
    }

    /**
     * @return array{credential: ApiCredential, secret: string}
     */
    public function rotate(ApiCredential $credential, User $actor): array
    {
        return DB::transaction(function () use ($credential, $actor) {
            $this->revoke($credential, $actor);

            $environment = $credential->environment()->with('project')->firstOrFail();

            $created = $this->create(
                environment: $environment,
                actor: $actor,
                name: $credential->name,
                kind: $credential->kind,
                scopes: $credential->scopes,
                expiresAt: $credential->expires_at,
            );

            $this->auditLogger->record(
                action: 'credential.rotated',
                resourceType: 'api_credential',
                resourceId: $created['credential']->id,
                actor: $actor,
                organizationId: $environment->project->organization_id,
                projectId: $environment->project_id,
                environmentId: $environment->id,
                metadata: [
                    'previous_credential_id' => $credential->id,
                    'key_prefix' => $created['credential']->key_prefix,
                ],
            );

            return $created;
        });
    }

    public function verify(string $plainSecret): ?ApiCredential
    {
        $prefix = substr($plainSecret, 0, 12);

        $candidates = ApiCredential::query()
            ->where('key_prefix', $prefix)
            ->where('status', ApiCredentialStatus::Active)
            ->get();

        foreach ($candidates as $candidate) {
            if (hash_equals($candidate->secret_hash, hash('sha256', $plainSecret))) {
                if (! $candidate->isActive()) {
                    return null;
                }

                $candidate->forceFill(['last_used_at' => now()])->save();

                return $candidate;
            }
        }

        return null;
    }

    private function generateSecret(ApiCredentialKind $kind): string
    {
        $tag = match ($kind) {
            ApiCredentialKind::Publishable => 'pub',
            ApiCredentialKind::ServerSecret => 'sec',
            ApiCredentialKind::Admin => 'adm',
        };

        $random = Str::lower(bin2hex(random_bytes(24)));

        return "ak_{$tag}_{$random}";
    }
}
