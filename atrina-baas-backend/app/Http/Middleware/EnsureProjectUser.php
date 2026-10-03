<?php

namespace App\Http\Middleware;

use App\Models\ProjectUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProjectUser
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof ProjectUser || ! $user->isActive()) {
            return response()->json([
                'error' => [
                    'code' => 'PROJECT_AUTH_REQUIRED',
                    'message' => 'A project user session is required.',
                ],
            ], 403);
        }

        $environment = $request->attributes->get('projectEnvironment');

        if ($environment !== null && $user->environment_id !== $environment->id) {
            return response()->json([
                'error' => [
                    'code' => 'PROJECT_CONTEXT_MISMATCH',
                    'message' => 'The authenticated user does not belong to this environment.',
                ],
            ], 403);
        }

        return $next($request);
    }
}
