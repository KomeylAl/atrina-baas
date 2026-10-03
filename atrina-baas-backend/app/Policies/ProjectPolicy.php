<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use App\Support\OrganizationAccess;

class ProjectPolicy
{
    public function __construct(private readonly OrganizationAccess $access) {}

    public function viewAny(User $user, Organization $organization): bool
    {
        return $user->isActive() && $this->access->belongsTo($user, $organization);
    }

    public function view(User $user, Project $project): bool
    {
        return $user->isActive() && $this->access->forProject($user, $project) !== null;
    }

    public function create(User $user, Organization $organization): bool
    {
        $role = $this->access->role($user, $organization);

        return $user->isActive() && $role !== null && $role->canWriteProjects();
    }

    public function update(User $user, Project $project): bool
    {
        $role = $this->access->forProject($user, $project)?->role;

        return $user->isActive() && $role !== null && $role->canWriteProjects();
    }

    public function archive(User $user, Project $project): bool
    {
        $role = $this->access->forProject($user, $project)?->role;

        return $user->isActive() && $role !== null && $role->canArchiveProjects();
    }

    public function manageEnvironments(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }

    public function viewUsage(User $user, Project $project): bool
    {
        return $this->view($user, $project);
    }

    public function viewAuditLogs(User $user, Project $project): bool
    {
        $role = $this->access->forProject($user, $project)?->role;

        return $user->isActive() && $role !== null && $role->canViewAuditLogs();
    }

    public function manageUsers(User $user, Project $project): bool
    {
        $role = $this->access->forProject($user, $project)?->role;

        return $user->isActive() && $role !== null && $role->canWriteProjects();
    }
}
