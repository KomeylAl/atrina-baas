<?php

namespace App\Enums;

enum BillingPeriodUnit: string
{
    case Day = 'day';
    case Week = 'week';
    case Month = 'month';
    case Year = 'year';
}
