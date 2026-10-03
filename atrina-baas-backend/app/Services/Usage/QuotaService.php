<?php

namespace App\Services\Usage;

use App\Enums\UsageMetric;
use App\Models\Environment;
use App\Models\EnvironmentQuota;
use Symfony\Component\HttpKernel\Exception\HttpException;

class QuotaService
{
    public function __construct(private readonly UsageRecorder $usageRecorder) {}

    /**
     * @return list<string> soft-warning metric names
     */
    public function enforce(Environment $environment, UsageMetric|string $metric): array
    {
        $metricValue = $metric instanceof UsageMetric ? $metric->value : $metric;

        $quota = EnvironmentQuota::query()
            ->where('environment_id', $environment->id)
            ->where('metric', $metricValue)
            ->where('status', 'active')
            ->first();

        if ($quota === null) {
            return [];
        }

        $used = $this->usageRecorder->sumForWindow($environment, $metricValue, $quota->window_seconds);
        $warnings = [];

        if ($quota->hard_limit !== null && $used >= $quota->hard_limit) {
            throw new HttpException(429, "Quota exceeded for metric [{$metricValue}].", null, [
                'X-Atrina-Quota-Metric' => $metricValue,
                'X-Atrina-Quota-Used' => (string) $used,
                'X-Atrina-Quota-Hard-Limit' => (string) $quota->hard_limit,
            ]);
        }

        if ($quota->soft_limit !== null && $used >= $quota->soft_limit) {
            $warnings[] = $metricValue;
        }

        return $warnings;
    }
}
