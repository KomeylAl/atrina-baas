<?php

namespace App\Support;

use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\User;

class OrganizationAccess
{
    public function membership(User $user, Organization $organization): ?OrganizationMember
    {
        return OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->where('status', OrganizationMemberStatus::Active)
            ->first();
    }

    public function role(User $user, Organization $organization): ?OrganizationMemberRole
    {
        return $this->membership($user, $organization)?->role;
    }

    public function belongsTo(User $user, Organization $organization): bool
    {
        return $this->membership($user, $organization) !== null;
    }

    public function forProject(User $user, Project $project): ?OrganizationMember
    {
        return $this->membership($user, $project->organization);
    }

    public function forEnvironment(User $user, Environment $environment): ?OrganizationMember
    {
        $environment->loadMissing('project.organization');

        return $this->membership($user, $environment->project->organization);
    }
}
