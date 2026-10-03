<?php

namespace App\Http\Middleware;

use App\Enums\UsageMetric;
use App\Models\Environment;
use App\Services\Usage\QuotaService;
use App\Services\Usage\UsageRecorder;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordDataPlaneUsage
{
    public function __construct(
        private readonly UsageRecorder $usageRecorder,
        private readonly QuotaService $quotaService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        /** @var Environment|null $environment */
        $environment = $request->attributes->get('projectEnvironment');

        $warnings = [];
        if ($environment instanceof Environment) {
            $warnings = $this->quotaService->enforce($environment, UsageMetric::ApiRequests);
        }

        /** @var Response $response */
        $response = $next($request);

        if ($environment instanceof Environment && $response->getStatusCode() < 500) {
            $this->usageRecorder->record($environment, UsageMetric::ApiRequests);

            if ($request->is('api/v1/data/*') && $response->getStatusCode() < 400) {
                $method = strtoupper($request->method());
                if ($method === 'GET') {
                    $this->usageRecorder->record($environment, UsageMetric::DataReads);
                } elseif (in_array($method, ['POST', 'PATCH', 'PUT', 'DELETE'], true)) {
                    $this->usageRecorder->record($environment, UsageMetric::DataWrites);
                }
            }

            if ($request->is('api/v1/billing/purchases/verify')
                && in_array($response->getStatusCode(), [200, 201], true)) {
                $this->usageRecorder->record($environment, UsageMetric::BillingVerifications);
            }
        }

        if ($warnings !== []) {
            $response->headers->set('X-Atrina-Quota-Warning', implode(',', $warnings));
        }

        return $response;
    }
}
