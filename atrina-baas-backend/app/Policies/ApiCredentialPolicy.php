<?php

namespace App\Policies;

use App\Models\ApiCredential;
use App\Models\User;
use App\Support\OrganizationAccess;

class ApiCredentialPolicy
{
    public function __construct(private readonly OrganizationAccess $access) {}

    public function view(User $user, ApiCredential $credential): bool
    {
        $credential->loadMissing('environment.project.organization');
        $role = $this->access->forEnvironment($user, $credential->environment)?->role;

        return $user->isActive() && $role !== null;
    }

    public function revoke(User $user, ApiCredential $credential): bool
    {
        $credential->loadMissing('environment.project.organization');
        $role = $this->access->forEnvironment($user, $credential->environment)?->role;

        return $user->isActive() && $role !== null && $role->canManageCredentials();
    }

    public function rotate(User $user, ApiCredential $credential): bool
    {
        return $this->revoke($user, $credential);
    }
}
