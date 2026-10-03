#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.prod}"
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

API_BASE="${SMOKE_API_BASE:-http://127.0.0.1:${API_HOST_PORT:-8080}}"
OWNER_EMAIL="${SMOKE_OWNER_EMAIL:-owner@atrina.local}"
OWNER_PASSWORD="${SMOKE_OWNER_PASSWORD:-password}"

echo "==> Liveness"
curl -fsS "$API_BASE/up" >/dev/null
echo "OK /up"

echo "==> Readiness"
READY="$(curl -fsS "$API_BASE/api/v1/health/ready")"
echo "$READY"
echo "$READY" | grep -q '"status":"ready"'

echo "==> Platform login"
LOGIN="$(curl -fsS -X POST "$API_BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}")"
TOKEN="$(php -r 'echo json_decode(stream_get_contents(STDIN), true)["token"] ?? "";' <<<"$LOGIN")"
if [[ -z "$TOKEN" ]]; then
  echo "Login failed. Seed owner first (mvp:seed-products or migrate --seed)." >&2
  echo "$LOGIN" >&2
  exit 1
fi
echo "OK platform token"

echo "==> List organizations"
ORGS="$(curl -fsS "$API_BASE/api/v1/organizations" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/json')"
ORG_ID="$(php -r '$j=json_decode(stream_get_contents(STDIN), true); echo $j["data"][0]["id"] ?? "";' <<<"$ORGS")"
if [[ -z "$ORG_ID" ]]; then
  echo "No organizations found." >&2
  exit 1
fi
echo "OK org $ORG_ID"

echo "==> List projects"
PROJECTS="$(curl -fsS "$API_BASE/api/v1/organizations/$ORG_ID/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/json')"
COUNT="$(php -r '$j=json_decode(stream_get_contents(STDIN), true); echo count($j["data"] ?? []);' <<<"$PROJECTS")"
echo "Found $COUNT project(s)"
if [[ "$COUNT" -lt 1 ]]; then
  echo "Expected at least one seeded product project." >&2
  exit 1
fi

PROJECT_ID="$(php -r '$j=json_decode(stream_get_contents(STDIN), true); echo $j["data"][0]["id"] ?? "";' <<<"$PROJECTS")"
PROJECT="$(curl -fsS "$API_BASE/api/v1/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/json')"
ENV_ID="$(php -r '$j=json_decode(stream_get_contents(STDIN), true); foreach(($j["data"]["environments"]??[]) as $e){ if(($e["slug"]??"")==="production"){ echo $e["id"]; break; }}' <<<"$PROJECT")"
CREDS="$(curl -fsS "$API_BASE/api/v1/environments/$ENV_ID/credentials" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/json')"
# Cannot recover plaintext secret from list — data-plane smoke uses usage + billing catalog via control plane.
USAGE="$(curl -fsS "$API_BASE/api/v1/projects/$PROJECT_ID/usage" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/json')"
echo "$USAGE" | grep -q 'project_id'
echo "OK usage aggregate"

CATALOG="$(curl -fsS "$API_BASE/api/v1/projects/$PROJECT_ID/billing/catalog" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/json')"
echo "$CATALOG" | grep -q 'premium\|Premium\|plans' || echo "$CATALOG" | grep -q '"data"'
echo "OK billing catalog"

echo "==> Smoke test passed"
