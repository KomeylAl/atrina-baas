<?php

namespace App\Enums;

enum BillingProviderName: string
{
    case CafeBazaar = 'cafebazaar';
    case Myket = 'myket';
    case Fake = 'fake';
}
