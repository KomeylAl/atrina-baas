<?php

namespace App\Enums;

enum DataPolicyOperation: string
{
    case Select = 'select';
    case Insert = 'insert';
    case Update = 'update';
    case Delete = 'delete';
}
