<?php

namespace App\Enums;

enum IdentityProvider: string
{
    case Password = 'password';
    case PhoneOtp = 'phone_otp';
    case Google = 'google';
}
