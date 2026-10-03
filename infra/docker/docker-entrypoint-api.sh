#!/bin/sh
set -eu

cd /app

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R ug+rwx storage bootstrap/cache 2>/dev/null || true

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  php artisan migrate --force --no-interaction
fi

if [ "${CACHE_CONFIG_ON_START:-true}" = "true" ]; then
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache || true
fi

exec "$@"
