# Local development

## Prerequisites

- Docker Desktop (or compatible Compose runtime)
- PHP 8.3+ (8.4 recommended) with extensions required by Laravel
- Composer 2
- Node.js 20+ and npm
- PostgreSQL client tools optional

## 1. Start infrastructure

From the repository root:

```bash
docker compose up -d
```

Defaults:

| Service | Host port | Credentials / notes |
|---------|-----------|---------------------|
| PostgreSQL | 5432 | user `atrina` / password `atrina` / db `atrina_baas_backend` |
| Redis | 6379 | no password |

## 2. Backend (Laravel)

```bash
cd atrina-baas-backend
cp .env.example .env
# Ensure DB_* matches Compose defaults (see .env.example)
composer install
php artisan key:generate
php artisan migrate --seed
composer run dev
```

API base (local): `http://localhost:8000`

Health endpoint: `GET /up`

Seeded platform user (after `--seed`):

- Email: `owner@atrina.local`
- Password: `password`

## 3. Frontend (Next.js dashboard)

```bash
cd atrina-baas-frontend
cp .env.example .env.local
npm install
npm run dev
```

Dashboard: `http://localhost:3000`

## 4. Tests

```bash
cd atrina-baas-backend
composer test
```

Frontend tests are not configured yet (Phase 0).

## Secrets

Never commit `.env` or `.env.local`. Only `.env.example` files with placeholders belong in git.
