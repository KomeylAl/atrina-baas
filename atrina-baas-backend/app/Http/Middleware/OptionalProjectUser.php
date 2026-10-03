<?php

namespace App\Http\Middleware;

use App\Models\ProjectUser;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class OptionalProjectUser
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! is_string($token) || $token === '') {
            return $next($request);
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $tokenable = $accessToken?->tokenable;

        if ($tokenable instanceof ProjectUser && $tokenable->isActive()) {
            $environment = $request->attributes->get('projectEnvironment');

            if ($environment !== null && $tokenable->environment_id !== $environment->id) {
                return response()->json([
                    'error' => [
                        'code' => 'PROJECT_CONTEXT_MISMATCH',
                        'message' => 'The authenticated user does not belong to this environment.',
                    ],
                ], 403);
            }

            $request->setUserResolver(fn () => $tokenable);
        }

        return $next($request);
    }
}
