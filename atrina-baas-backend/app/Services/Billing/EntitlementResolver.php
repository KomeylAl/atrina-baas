<?php

namespace App\Services\Billing;

use App\Enums\SubscriptionStatus;
use App\Models\Environment;
use App\Models\ProjectUser;
use App\Models\Subscription;
use Illuminate\Support\Collection;

class EntitlementResolver
{
    /**
     * @return list<array{code: string, name: string, value: mixed, source_subscription_id: string, expires_at: ?string}>
     */
    public function forUser(Environment $environment, ProjectUser $user): array
    {
        /** @var Collection<int, Subscription> $subscriptions */
        $subscriptions = Subscription::query()
            ->with('plan.entitlements')
            ->where('environment_id', $environment->id)
            ->where('project_user_id', $user->id)
            ->where('status', SubscriptionStatus::Active)
            ->where('current_period_end', '>', now())
            ->get();

        $entitlements = [];

        foreach ($subscriptions as $subscription) {
            foreach ($subscription->plan->entitlements as $entitlement) {
                $code = $entitlement->code;
                $candidate = [
                    'code' => $code,
                    'name' => $entitlement->name,
                    'value' => $entitlement->pivot->value ?? true,
                    'source_subscription_id' => $subscription->id,
                    'expires_at' => $subscription->current_period_end?->toIso8601String(),
                ];

                if (! isset($entitlements[$code])
                    || ($subscription->current_period_end !== null
                        && $subscription->current_period_end->gt($entitlements[$code]['_end']))) {
                    $entitlements[$code] = $candidate + ['_end' => $subscription->current_period_end];
                }
            }
        }

        return array_values(array_map(function (array $item) {
            unset($item['_end']);

            return $item;
        }, $entitlements));
    }
}
