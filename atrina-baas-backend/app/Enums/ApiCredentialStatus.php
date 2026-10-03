<?php

namespace App\Enums;

enum ApiCredentialStatus: string
{
    case Active = 'active';
    case Revoked = 'revoked';
    case Expired = 'expired';
}
