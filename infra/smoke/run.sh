#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=infra/smoke/lib.sh
. "$(dirname "$0")/lib.sh"
TAG="${SMOKE_TAG:-smoke}"

keys() { grep -oE '^[A-Z0-9_]+' "$1" | sort; }
expected_keys="$(keys "$ROOT/apps/api/.env.example" | grep -vxE 'NODE_ENV|PORT|DATABASE_URL|TRUSTED_PROXY_HOPS|TEST_DATABASE_URL')"
[ "$expected_keys" = "$(keys "$ROOT/infra/api.env.example")" ] || fail "infra/api.env.example must list apps/api/.env.example keys minus those set by Compose"
pass "infra/api.env.example matches the API env keys"

prepare_stack "$TAG"
build_image "$TAG"

compose config -q
compose up -d db
compose run --rm api node dist/migrate.js | grep -q "migrations applied" || fail "migrations did not apply"
pass "migrations applied in a one-off container"
compose up -d

wait_ready || true
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

[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/session")" = "403" ] || fail "session without X-Proxy-Auth must be 403"
session_cookie="$(curl -s -D - -o /dev/null -H "x-proxy-auth: $SECRET" "$BASE/session" | tr -d '\r' | grep -i '^set-cookie: __Host-agri_session=' || true)"
if [ -n "$session_cookie" ] && echo "$session_cookie" | grep -q 'HttpOnly' && echo "$session_cookie" | grep -q 'Secure' && echo "$session_cookie" | grep -q 'Path=/' && ! echo "$session_cookie" | grep -qi 'Domain='; then
  pass "session cookie through Caddy is host-only and HttpOnly"
else
  fail "session cookie through Caddy: ${session_cookie:-none}"
fi

python3 "$ROOT/infra/smoke/stream-timing.py" "$BASE/chat" "$SECRET" "please repeat these few words back to me one by one slowly" || fail "chat stream through Caddy"
pass "chat streams incrementally through Caddy"

sleep 1
if compose logs caddy 2>/dev/null | grep -q "$SECRET"; then fail "Caddy access log contains the proxy secret"; fi
if compose logs caddy 2>/dev/null | grep -q "wrong-secret"; then fail "Caddy access log contains a client-sent X-Proxy-Auth"; fi
pass "Caddy access log keeps proxy secrets out"

[ -x "$ROOT/infra/check-production.sh" ] || fail "infra/check-production.sh is missing"
"$ROOT/infra/check-production.sh" --api "$BASE" --skip-ports || fail "check-production against the smoke stack"
pass "check-production passes against the smoke stack"
if "$ROOT/infra/check-production.sh" --api "http://127.0.0.1:1" --skip-ports >/dev/null 2>&1; then fail "check-production passed against a dead API"; fi
pass "check-production fails against a dead API"
"$ROOT/infra/check-production.sh" --api >/dev/null 2>&1 &
checker=$!
sleep 3
if kill -0 "$checker" 2>/dev/null; then kill "$checker"; fail "check-production hangs on an option without a value"; fi
pass "check-production rejects an option without a value"

echo "smoke passed"
