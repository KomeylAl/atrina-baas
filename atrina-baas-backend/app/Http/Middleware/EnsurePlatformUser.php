<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformUser
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof User) {
            return response()->json([
                'error' => [
                    'code' => 'PLATFORM_AUTH_REQUIRED',
                    'message' => 'A platform user session is required.',
                ],
            ], 403);
        }

        return $next($request);
    }
}
