<?php

use App\Http\Controllers\Api\V1\ApiCredentialController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BillingAdminController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\DataRecordController;
use App\Http\Controllers\Api\V1\DataTableController;
use App\Http\Controllers\Api\V1\EnvironmentController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\OrganizationController;
use App\Http\Controllers\Api\V1\ProjectAuthController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\ProjectUserController;
use App\Http\Controllers\Api\V1\UsageController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health/ready', [HealthController::class, 'ready']);

    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware([
        'project.credential:publishable,server_secret,admin',
        'project.user.optional',
        'usage.record',
        'throttle:120,1',
    ])->group(function () {
        Route::get('/data/{table}', [DataRecordController::class, 'index']);
        Route::post('/data/{table}', [DataRecordController::class, 'store']);
        Route::get('/data/{table}/{recordId}', [DataRecordController::class, 'show']);
        Route::patch('/data/{table}/{recordId}', [DataRecordController::class, 'update']);
        Route::delete('/data/{table}/{recordId}', [DataRecordController::class, 'destroy']);

        Route::get('/billing/products', [BillingController::class, 'products']);
        Route::get('/billing/plans', [BillingController::class, 'plans']);

        Route::middleware('project.user')->group(function () {
            Route::post('/billing/purchases/verify', [BillingController::class, 'verify'])->middleware('throttle:30,1');
            Route::get('/billing/purchases', [BillingController::class, 'purchases']);
            Route::get('/billing/subscriptions', [BillingController::class, 'subscriptions']);
            Route::get('/billing/subscriptions/{subscriptionId}', [BillingController::class, 'showSubscription']);
            Route::get('/billing/entitlements', [BillingController::class, 'entitlements']);
        });
    });

    Route::middleware([
        'project.credential:publishable,server_secret',
        'usage.record',
    ])->prefix('project-auth')->group(function () {
        Route::post('/signup', [ProjectAuthController::class, 'signup'])->middleware('throttle:20,1');
        Route::post('/login', [ProjectAuthController::class, 'login'])->middleware('throttle:20,1');
        Route::post('/otp/request', [ProjectAuthController::class, 'requestOtp'])->middleware('throttle:10,1');
        Route::post('/otp/verify', [ProjectAuthController::class, 'verifyOtp'])->middleware('throttle:20,1');
        Route::post('/google', [ProjectAuthController::class, 'google'])->middleware('throttle:20,1');

        Route::middleware(['auth:sanctum', 'project.user'])->group(function () {
            Route::get('/me', [ProjectAuthController::class, 'me']);
            Route::post('/logout', [ProjectAuthController::class, 'logout']);
            Route::post('/refresh', [ProjectAuthController::class, 'refresh']);
        });
    });

    Route::middleware(['auth:sanctum', 'platform.user'])->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/organizations', [OrganizationController::class, 'index']);
        Route::post('/organizations', [OrganizationController::class, 'store']);

        // Nested project routes before the singular organization show/update route.
        Route::get('/organizations/{organization}/projects', [ProjectController::class, 'index']);
        Route::post('/organizations/{organization}/projects', [ProjectController::class, 'store']);

        Route::get('/organizations/{organization}', [OrganizationController::class, 'show']);
        Route::patch('/organizations/{organization}', [OrganizationController::class, 'update']);
        Route::get('/projects/{project}', [ProjectController::class, 'show']);
        Route::patch('/projects/{project}', [ProjectController::class, 'update']);
        Route::post('/projects/{project}/archive', [ProjectController::class, 'archive']);

        Route::get('/projects/{project}/environments', [EnvironmentController::class, 'index']);
        Route::post('/projects/{project}/environments', [EnvironmentController::class, 'store']);
        Route::patch('/environments/{environment}', [EnvironmentController::class, 'update']);

        Route::get('/environments/{environment}/credentials', [ApiCredentialController::class, 'index']);
        Route::post('/environments/{environment}/credentials', [ApiCredentialController::class, 'store']);
        Route::post('/credentials/{credential}/revoke', [ApiCredentialController::class, 'revoke']);
        Route::post('/credentials/{credential}/rotate', [ApiCredentialController::class, 'rotate']);

        Route::get('/projects/{project}/users', [ProjectUserController::class, 'index']);
        Route::get('/projects/{project}/users/{projectUser}', [ProjectUserController::class, 'show']);
        Route::patch('/projects/{project}/users/{projectUser}', [ProjectUserController::class, 'update']);
        Route::post('/projects/{project}/users/{projectUser}/revoke-sessions', [ProjectUserController::class, 'revokeSessions']);

        Route::get('/projects/{project}/usage', [UsageController::class, 'show']);
        Route::put('/environments/{environment}/quotas', [UsageController::class, 'upsertQuota']);
        Route::get('/projects/{project}/audit-logs', [AuditLogController::class, 'index']);

        Route::get('/environments/{environment}/data-tables', [DataTableController::class, 'index']);
        Route::post('/environments/{environment}/data-tables', [DataTableController::class, 'store']);
        Route::get('/data-tables/{dataTable}', [DataTableController::class, 'show']);
        Route::patch('/data-tables/{dataTable}', [DataTableController::class, 'update']);
        Route::put('/data-tables/{dataTable}/policies', [DataTableController::class, 'upsertPolicy']);
        Route::get('/data-tables/{dataTable}/records', [DataTableController::class, 'explore']);

        Route::get('/projects/{project}/billing/catalog', [BillingAdminController::class, 'catalog']);
        Route::post('/projects/{project}/billing/products', [BillingAdminController::class, 'storeProduct']);
        Route::post('/projects/{project}/billing/products/{product}/plans', [BillingAdminController::class, 'storePlan']);
        Route::post('/projects/{project}/billing/plans/{plan}/provider-products', [BillingAdminController::class, 'mapProviderProduct']);
        Route::put('/environments/{environment}/billing-providers', [BillingAdminController::class, 'upsertBillingProvider']);
        Route::get('/projects/{project}/billing/purchases', [BillingAdminController::class, 'purchases']);
        Route::get('/projects/{project}/billing/subscriptions', [BillingAdminController::class, 'subscriptions']);
    });
});
