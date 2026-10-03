<?php

namespace App\Enums;

enum OrganizationMemberRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Developer = 'developer';
    case Billing = 'billing';
    case Viewer = 'viewer';

    public function canManageMembers(): bool
    {
        return in_array($this, [self::Owner, self::Admin], true);
    }

    public function canWriteProjects(): bool
    {
        return in_array($this, [self::Owner, self::Admin, self::Developer], true);
    }

    public function canManageCredentials(): bool
    {
        return in_array($this, [self::Owner, self::Admin, self::Developer], true);
    }

    public function canArchiveProjects(): bool
    {
        return in_array($this, [self::Owner, self::Admin], true);
    }

    public function canViewAuditLogs(): bool
    {
        return in_array($this, [self::Owner, self::Admin, self::Developer, self::Viewer], true);
    }

    public function canViewUsage(): bool
    {
        return true;
    }

    public function canManageBilling(): bool
    {
        return in_array($this, [self::Owner, self::Admin, self::Billing, self::Developer], true);
    }

    public function canViewBilling(): bool
    {
        return in_array($this, [self::Owner, self::Admin, self::Billing, self::Developer, self::Viewer], true);
    }
}
