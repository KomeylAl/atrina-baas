<?php

namespace App\Enums;

enum ProjectUserStatus: string
{
    case Active = 'active';
    case Blocked = 'blocked';
    case Deleted = 'deleted';
    case Pending = 'pending';
}
