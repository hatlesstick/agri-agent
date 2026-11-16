#!/usr/bin/env bash
# shellcheck disable=SC2034
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${SMOKE_IMAGE:-agri-api}"
PROJECT="${SMOKE_PROJECT:-agri-smoke}"
HTTP_PORT="${SMOKE_HTTP_PORT:-18080}"
BASE="http://127.0.0.1:${HTTP_PORT}"
WORK="$(mktemp -d)"
SECRET="$(openssl rand -hex 24)"
export COMPOSE_PROJECT_NAME="$PROJECT"

fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }
pass() { echo "ok - $*"; }

compose() { docker compose --project-directory "$WORK" -f "$WORK/docker-compose.prod.yml" "$@"; }

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then compose logs --tail 50 >&2 || true; fi
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$WORK"
  exit "$status"
}
trap cleanup EXIT

prepare_stack() {
  local tag="$1"
  [ -f "$ROOT/infra/docker-compose.prod.yml" ] || fail "infra/docker-compose.prod.yml is missing"
  cp "$ROOT/infra/docker-compose.prod.yml" "$ROOT/infra/Caddyfile" "$WORK/"
  cat > "$WORK/.env" <<ENV
API_IMAGE=$IMAGE
API_TAG=$tag
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
}

build_image() {
  local tag="$1"
  if [ "${SMOKE_SKIP_BUILD:-0}" != "1" ] || ! docker image inspect "$IMAGE:$tag" >/dev/null 2>&1; then
    docker build -q -f "$ROOT/apps/api/Dockerfile" -t "$IMAGE:$tag" "$ROOT" >/dev/null
  fi
}

wait_ready() {
  for _ in $(seq 1 60); do
    if curl -fsS "$BASE/health/ready" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}
