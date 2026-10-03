<?php

namespace App\Enums;

enum UsageMetric: string
{
    case ApiRequests = 'api_requests';
    case DataReads = 'data_reads';
    case DataWrites = 'data_writes';
    case AuthSignins = 'auth_signins';
    case BillingVerifications = 'billing_verifications';
}
