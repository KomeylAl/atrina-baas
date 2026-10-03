<?php

namespace App\Enums;

enum EnvironmentType: string
{
    case Development = 'development';
    case Staging = 'staging';
    case Production = 'production';
    case Custom = 'custom';
}
