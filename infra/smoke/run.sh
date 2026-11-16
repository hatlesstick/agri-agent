#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IMAGE="${SMOKE_IMAGE:-agri-api}"
TAG="${SMOKE_TAG:-smoke}"
PROJECT="${SMOKE_PROJECT:-agri-smoke}"
HTTP_PORT="${SMOKE_HTTP_PORT:-18080}"
BASE="http://127.0.0.1:${HTTP_PORT}"
WORK="$(mktemp -d)"
SECRET="$(openssl rand -hex 24)"

fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }
pass() { echo "ok - $*"; }

compose() { docker compose --project-name "$PROJECT" --project-directory "$WORK" -f "$WORK/docker-compose.prod.yml" "$@"; }

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then compose logs --tail 50 >&2 || true; fi
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$WORK"
  exit "$status"
}
trap cleanup EXIT

[ -f "$ROOT/infra/docker-compose.prod.yml" ] || fail "infra/docker-compose.prod.yml is missing"

keys() { grep -oE '^[A-Z0-9_]+' "$1" | sort; }
expected_keys="$(keys "$ROOT/apps/api/.env.example" | grep -vxE 'NODE_ENV|PORT|DATABASE_URL|TRUSTED_PROXY_HOPS|TEST_DATABASE_URL')"
[ "$expected_keys" = "$(keys "$ROOT/infra/api.env.example")" ] || fail "infra/api.env.example must list apps/api/.env.example keys minus those set by Compose"
pass "infra/api.env.example matches the API env keys"
cp "$ROOT/infra/docker-compose.prod.yml" "$ROOT/infra/Caddyfile" "$WORK/"

cat > "$WORK/.env" <<ENV
API_IMAGE=$IMAGE
API_TAG=$TAG
API_SITE_ADDRESS=:80
CADDY_HTTP_BIND=127.0.0.1:$HTTP_PORT
CADDY_HTTPS_BIND=127.0.0.1:$((HTTP_PORT + 363))
POSTGRES_USER=agri
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=agri
ENV

cat > "$WORK/api.env" <<ENV
AI_MOCK=1
LOG_LEVEL=warn
PROXY_AUTH_SECRET=$SECRET
OPEN_METEO_GEOCODING_URL=https://geocoding-api.open-meteo.com/v1/search
OPEN_METEO_FORECAST_URL=https://api.open-meteo.com/v1/forecast
ENV

if [ "${SMOKE_SKIP_BUILD:-0}" != "1" ]; then
  docker build -q -f "$ROOT/apps/api/Dockerfile" -t "$IMAGE:$TAG" "$ROOT" >/dev/null
fi

compose config -q
compose up -d db
compose run --rm api node dist/migrate.js | grep -q "migrations applied" || fail "migrations did not apply"
pass "migrations applied in a one-off container"
compose up -d

for _ in $(seq 1 60); do
  if curl -fsS "$BASE/health/ready" >/dev/null 2>&1; then break; fi
  sleep 1
done
ready="$(curl -sS "$BASE/health/ready")"
echo "$ready" | grep -q '"database":"ok"' || fail "readiness through Caddy: $ready"
pass "readiness through Caddy reports the database"

[ -z "$(docker port "$(compose ps -q db)")" ] || fail "db publishes a port"
[ -z "$(docker port "$(compose ps -q api)")" ] || fail "api publishes a port"
[ -n "$(docker port "$(compose ps -q caddy)")" ] || fail "caddy publishes no port"
pass "db and api publish no ports"

chat_status() { curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/chat" -H 'content-type: application/json' "$@" --data '{"messages":[{"id":"u1","role":"user","parts":[{"type":"text","text":"hello"}]}]}'; }
[ "$(chat_status)" = "403" ] || fail "chat without X-Proxy-Auth must be 403"
[ "$(chat_status -H 'x-proxy-auth: wrong-secret')" = "403" ] || fail "chat with a wrong X-Proxy-Auth must be 403"
pass "chat without a valid proxy secret is forbidden"

python3 "$ROOT/infra/smoke/stream-timing.py" "$BASE/chat" "$SECRET" "please repeat these few words back to me one by one slowly" || fail "chat stream through Caddy"
pass "chat streams incrementally through Caddy"

echo "smoke passed"
