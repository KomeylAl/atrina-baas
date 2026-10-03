<?php

namespace App\Enums;

enum PurchaseStatus: string
{
    case Pending = 'pending';
    case Verified = 'verified';
    case Rejected = 'rejected';
    case Refunded = 'refunded';
    case Revoked = 'revoked';
    case Expired = 'expired';
}
