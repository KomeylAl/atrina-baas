<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    case Pending = 'pending';
    case Trialing = 'trialing';
    case Active = 'active';
    case GracePeriod = 'grace_period';
    case PastDue = 'past_due';
    case Canceled = 'canceled';
    case Expired = 'expired';
    case Revoked = 'revoked';
}
