<?php

namespace App\Policies;

use App\Models\Environment;
use App\Models\User;
use App\Support\OrganizationAccess;

class EnvironmentPolicy
{
    public function __construct(private readonly OrganizationAccess $access) {}

    public function view(User $user, Environment $environment): bool
    {
        return $user->isActive() && $this->access->forEnvironment($user, $environment) !== null;
    }

    public function update(User $user, Environment $environment): bool
    {
        $role = $this->access->forEnvironment($user, $environment)?->role;

        return $user->isActive() && $role !== null && $role->canWriteProjects();
    }

    public function manageCredentials(User $user, Environment $environment): bool
    {
        $role = $this->access->forEnvironment($user, $environment)?->role;

        return $user->isActive() && $role !== null && $role->canManageCredentials();
    }
}
