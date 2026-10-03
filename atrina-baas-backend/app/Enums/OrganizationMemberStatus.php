<?php

namespace App\Enums;

enum OrganizationMemberStatus: string
{
    case Invited = 'invited';
    case Active = 'active';
    case Suspended = 'suspended';
}
