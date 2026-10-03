<?php

use App\Http\Middleware\EnsurePlatformUser;
use App\Http\Middleware\EnsureProjectUser;
use App\Http\Middleware\OptionalProjectUser;
use App\Http\Middleware\RecordDataPlaneUsage;
use App\Http\Middleware\ResolveProjectCredential;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust reverse proxies (Caddy/Nginx) on VPS so HTTPS / client IP are correct.
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'project.credential' => ResolveProjectCredential::class,
            'platform.user' => EnsurePlatformUser::class,
            'project.user' => EnsureProjectUser::class,
            'project.user.optional' => OptionalProjectUser::class,
            'usage.record' => RecordDataPlaneUsage::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
