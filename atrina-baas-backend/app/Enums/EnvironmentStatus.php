<?php

namespace App\Enums;

enum EnvironmentStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
    case Archived = 'archived';
}
