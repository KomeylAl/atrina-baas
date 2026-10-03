<?php

namespace App\Services\Billing;

use App\Enums\BillingPeriodUnit;
use App\Models\Plan;
use Carbon\CarbonImmutable;

class SubscriptionPeriodCalculator
{
    public function extendFrom(Plan $plan, ?\DateTimeInterface $from = null): array
    {
        $start = CarbonImmutable::instance($from ?? now())->utc();
        $anchor = $start->greaterThan(now()->utc()) ? $start : now()->utc();

        $end = match ($plan->billing_period_unit) {
            BillingPeriodUnit::Day => $anchor->addDays($plan->billing_period_count),
            BillingPeriodUnit::Week => $anchor->addWeeks($plan->billing_period_count),
            BillingPeriodUnit::Month => $anchor->addMonthsNoOverflow($plan->billing_period_count),
            BillingPeriodUnit::Year => $anchor->addYearsNoOverflow($plan->billing_period_count),
        };

        return [
            'start' => $from ? CarbonImmutable::instance($from)->utc() : $anchor,
            'end' => $end,
        ];
    }
}
