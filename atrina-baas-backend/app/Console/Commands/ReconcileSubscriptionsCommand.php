<?php

namespace App\Console\Commands;

use App\Services\Billing\SubscriptionReconciler;
use Illuminate\Console\Command;

class ReconcileSubscriptionsCommand extends Command
{
    protected $signature = 'billing:reconcile-subscriptions';

    protected $description = 'Expire ended prepaid subscriptions and revoke refunded purchases';

    public function handle(SubscriptionReconciler $reconciler): int
    {
        $result = $reconciler->reconcile();

        $this->info("Expired {$result['expired']} subscription(s); revoked {$result['revoked']} subscription(s).");

        return self::SUCCESS;
    }
}
