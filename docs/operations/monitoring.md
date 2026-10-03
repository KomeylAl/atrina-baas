# Monitoring and alerting

## Health endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /up` | Process liveness (Laravel default) |
| `GET /api/v1/health/ready` | Readiness: database required; Redis optional when queue/cache are sync/array |

Probe `/up` for liveness and `/api/v1/health/ready` for readiness. Do not expose DB hostnames or credentials in public responses (ready only returns `ok`/`fail` per check).

## Suggested alerts

| Signal | Severity | Notes |
|--------|----------|-------|
| Ready check failing 2+ minutes | P1 | Page on-call |
| HTTP 5xx rate > 2% over 5 minutes | P1 | Filter out client 4xx |
| Queue failed jobs growing | P2 | When Redis/queue workers are enabled |
| Billing verify 4xx spike | P2 | Possible store outage or bad client build |
| Auth failure spike | P2 | Possible credential stuffing |
| Quota 429 spike on one project | P3 | Informational / customer success |

## Logs

Use structured JSON logs (Laravel + stdout). Never log passwords, OTPs, API secrets, purchase tokens, or Google ID tokens.

Recommended fields: `timestamp`, `level`, `message`, `request_id`, `project_id`, `environment_id`, `duration_ms`, `status`.

## Metrics (v1)

Application-emitted usage metrics (see ADR-008) are available via control-plane:

`GET /api/v1/projects/{projectId}/usage`

Infrastructure metrics (CPU, memory, disk, Postgres connections) come from the host/orchestrator and are out of band of this repo.
