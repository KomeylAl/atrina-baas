# ADR-006: Data API storage and schema model

- **Status:** Accepted
- **Date:** 2026-10-03
- **Phase:** 3

## Context

Phase 3 requires a managed Data API without exposing arbitrary SQL. Options:

1. Dynamic physical tables per collection
2. Shared `data_records` table with JSONB payloads validated against an explicit schema
3. External document store

## Decision

Use **shared PostgreSQL** with:

- `data_tables` — explicit collection metadata + JSON schema definition
- `data_policies` — per-operation authorization for anonymous / authenticated / service
- `data_records` — tenant-scoped rows with JSONB `data`, optional `owner_id`

Public API validates columns, types, filters, pagination, and payload size. No raw SQL from clients.

## Consequences

- Faster MVP and simpler migrations
- Indexing is coarser than typed columns (acceptable initially)
- Later extraction to typed/physical tables remains possible without changing the public `/data/{table}` contract
