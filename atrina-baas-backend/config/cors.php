<?php

$defaultOrigins = env('APP_ENV') === 'local'
    ? 'http://localhost:3000,http://127.0.0.1:3000'
    : (string) env('FRONTEND_URL', 'http://localhost:3000');

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', $defaultOrigins)),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [
        'X-Atrina-Quota-Warning',
        'X-Atrina-Quota-Metric',
        'X-Atrina-Quota-Used',
        'X-Atrina-Quota-Hard-Limit',
    ],

    'max_age' => 0,

    'supports_credentials' => false,

];
