<?php

namespace App\Enums;

enum ProjectStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
    case Archived = 'archived';
}
