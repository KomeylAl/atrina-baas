<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;
use App\Support\OrganizationAccess;

class OrganizationPolicy
{
    public function __construct(private readonly OrganizationAccess $access) {}

    public function viewAny(User $user): bool
    {
        return $user->isActive();
    }

    public function view(User $user, Organization $organization): bool
    {
        return $user->isActive() && $this->access->belongsTo($user, $organization);
    }

    public function create(User $user): bool
    {
        return $user->isActive();
    }

    public function update(User $user, Organization $organization): bool
    {
        $role = $this->access->role($user, $organization);

        return $user->isActive() && $role !== null && $role->canManageMembers();
    }

    public function viewAuditLogs(User $user, Organization $organization): bool
    {
        $role = $this->access->role($user, $organization);

        return $user->isActive() && $role !== null && $role->canViewAuditLogs();
    }

    public function viewUsage(User $user, Organization $organization): bool
    {
        $role = $this->access->role($user, $organization);

        return $user->isActive() && $role !== null && $role->canViewUsage();
    }
}
