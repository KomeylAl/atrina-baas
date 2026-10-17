# Atrina BaaS — PostgreSQL Migration Guide

This document describes how to migrate Atrina BaaS from SQLite (default for
local development) to PostgreSQL for production deployments.

## Why Migrate?

SQLite is fine for development and small single-user deployments. For production
with concurrent users, you should use PostgreSQL for:

- Concurrent write access (SQLite serializes writes)
- Row-Level Security (RLS) for defense-in-depth tenant isolation (see README §4.2)
- Connection pooling
- Backups and replication
- Better performance at scale

## Migration Steps

### 1. Provision a PostgreSQL Database

Create a database and user for Atrina BaaS:

```sql
CREATE DATABASE atrina_baas;
CREATE USER atrina WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE atrina_baas TO atrina;
```

### 2. Update `.env`

```bash
# Replace the SQLite URL with PostgreSQL:
DATABASE_URL="postgresql://atrina:your-strong-password@localhost:5432/atrina_baas?schema=public"
```

### 3. Update `prisma/schema.prisma`

Change the `provider` from `sqlite` to `postgresql`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4. Push the Schema

```bash
bun run db:push
```

This will create all tables in PostgreSQL. The `prisma db push` command is
non-destructive — it will only create missing tables/columns. If the database
has conflicting existing data, you may need to use `prisma migrate dev` instead.

### 5. (Optional) Seed Production Data

If you want to seed an admin user and a default organization:

```bash
bun run scripts/seed.ts
```

**Note:** The seed script wipes existing data. Do NOT run it against a database
that already has production data.

### 6. (Recommended) Enable Row-Level Security

Per the README (section 4.2), PostgreSQL Row-Level Security provides defense-in-depth
for tenant isolation. Enable it with the following SQL (run after `db:push`):

```sql
-- Enable RLS on project-scoped tables
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Create policies. The application sets `SET LOCAL atrina.project_id = '...'`
-- at the start of each transaction. These policies ensure that even if the
-- application has a bug that forgets to filter by project_id, the database
-- itself will not return rows from other projects.
CREATE POLICY project_isolation ON project_users
  USING (current_setting('atrina.project_id', true) = '' OR project_id::text = current_setting('atrina.project_id', true));

-- Repeat for each table that has project_id column.
-- For tables that have environment_id but not project_id, use a JOIN policy.
```

### 7. (Optional) Set Up Connection Pooling

For production with many concurrent connections, use PgBouncer or Prisma's
built-in connection pooling:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_DIRECT_URL")  // For migrations
}
```

### 8. Backup Strategy

```bash
# Daily backup (cron):
pg_dump atrina_baas > backups/atrina_$(date +%Y%m%d).sql

# Restore (in isolated environment):
psql atrina_baas < backups/atrina_20260101.sql
```

Define your RPO (Recovery Point Objective) and RTO (Recovery Time Objective)
before production launch (per README §14.4).

## Verifying the Migration

After migrating:

1. Start the dev server: `bun run dev`
2. Visit `http://localhost:3000/api/health?check=ready` — should return `{ ok: true }`.
3. Login with demo credentials and verify data appears.
4. Run `bun run scripts/seed.ts` (against a test DB only!) and verify all data
   appears in the dashboard.

## Rollback

If the migration fails:

1. Restore `.env` to the SQLite URL.
2. Restore `prisma/schema.prisma` to `provider = "sqlite"`.
3. Run `bun run db:push` to recreate the SQLite schema.
4. Re-run `bun run scripts/seed.ts` to repopulate demo data.
