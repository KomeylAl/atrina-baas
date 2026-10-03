<?php

namespace App\Enums;

enum ApiCredentialKind: string
{
    case Publishable = 'publishable';
    case ServerSecret = 'server_secret';
    case Admin = 'admin';
}
