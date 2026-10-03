<?php

namespace App\Services;

use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Enums\OrganizationStatus;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrganizationService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function create(User $owner, string $name, ?string $slug = null): Organization
    {
        return DB::transaction(function () use ($owner, $name, $slug) {
            $organization = Organization::query()->create([
                'name' => $name,
                'slug' => $this->uniqueSlug($slug ?: $name),
                'status' => OrganizationStatus::Active,
            ]);

            OrganizationMember::query()->create([
                'organization_id' => $organization->id,
                'user_id' => $owner->id,
                'role' => OrganizationMemberRole::Owner,
                'status' => OrganizationMemberStatus::Active,
            ]);

            $this->auditLogger->record(
                action: 'organization.created',
                resourceType: 'organization',
                resourceId: $organization->id,
                actor: $owner,
                organizationId: $organization->id,
                metadata: [
                    'name' => $organization->name,
                    'slug' => $organization->slug,
                ],
            );

            return $organization;
        });
    }

    public function update(Organization $organization, User $actor, array $attributes): Organization
    {
        $organization->fill(collect($attributes)->only(['name', 'slug', 'status'])->all());

        if ($organization->isDirty('slug') && $organization->slug !== null) {
            $organization->slug = $this->uniqueSlug($organization->slug, $organization->id);
        }

        $organization->save();

        $this->auditLogger->record(
            action: 'organization.updated',
            resourceType: 'organization',
            resourceId: $organization->id,
            actor: $actor,
            organizationId: $organization->id,
            metadata: [
                'changes' => array_keys($organization->getChanges()),
            ],
        );

        return $organization->refresh();
    }

    private function uniqueSlug(string $value, ?string $ignoreId = null): string
    {
        $base = Str::slug($value);
        $slug = $base !== '' ? $base : 'org';
        $candidate = $slug;
        $suffix = 1;

        while (
            Organization::query()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $candidate)
                ->exists()
        ) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
