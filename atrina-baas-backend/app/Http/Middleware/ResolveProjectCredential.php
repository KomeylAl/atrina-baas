<?php

namespace App\Http\Middleware;

use App\Enums\ApiCredentialKind;
use App\Services\ApiCredentialService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveProjectCredential
{
    public function __construct(private readonly ApiCredentialService $credentials) {}

    /**
     * @param  Closure(Request): Response  $next
     * @param  list<string>|string  $allowedKinds
     */
    public function handle(Request $request, Closure $next, string ...$allowedKinds): Response
    {
        $plain = $request->header('X-Atrina-Key')
            ?? $request->header('X-API-Key');

        if (! is_string($plain) || $plain === '') {
            return response()->json([
                'error' => [
                    'code' => 'PROJECT_CREDENTIAL_REQUIRED',
                    'message' => 'A project API key is required.',
                ],
            ], 401);
        }

        $credential = $this->credentials->verify($plain);

        if ($credential === null) {
            return response()->json([
                'error' => [
                    'code' => 'PROJECT_CREDENTIAL_INVALID',
                    'message' => 'The project API key is invalid or revoked.',
                ],
            ], 401);
        }

        $kinds = $allowedKinds === []
            ? [ApiCredentialKind::Publishable->value, ApiCredentialKind::ServerSecret->value]
            : $allowedKinds;

        if (! in_array($credential->kind->value, $kinds, true)) {
            return response()->json([
                'error' => [
                    'code' => 'PROJECT_CREDENTIAL_FORBIDDEN',
                    'message' => 'This credential kind cannot access this endpoint.',
                ],
            ], 403);
        }

        $credential->loadMissing('environment.project');

        $request->attributes->set('apiCredential', $credential);
        $request->attributes->set('projectEnvironment', $credential->environment);
        $request->attributes->set('project', $credential->environment->project);

        return $next($request);
    }
}
