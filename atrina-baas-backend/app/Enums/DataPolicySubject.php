<?php

namespace App\Enums;

enum DataPolicySubject: string
{
    case Anonymous = 'anonymous';
    case Authenticated = 'authenticated';
    case Service = 'service';
}
