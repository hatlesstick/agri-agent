#!/usr/bin/env bash
set -euo pipefail
SMOKE_PROJECT="${SMOKE_PROJECT:-agri-deploy-test}"
SMOKE_HTTP_PORT="${SMOKE_HTTP_PORT:-18090}"
# shellcheck source=infra/smoke/lib.sh
. "$(dirname "$0")/lib.sh"

[ -f "$ROOT/infra/deploy.sh" ] || fail "infra/deploy.sh is missing"

build_image smoke
docker tag "$IMAGE:smoke" "$IMAGE:deploy-a"
docker tag "$IMAGE:smoke" "$IMAGE:deploy-b"
printf 'FROM %s\nCMD ["node", "-e", "process.exit(1)"]\n' "$IMAGE:smoke" | docker build -q -t "$IMAGE:deploy-crashes" - >/dev/null
printf 'FROM %s\nRUN echo "process.exit(1)" > dist/migrate.js\n' "$IMAGE:smoke" | docker build -q -t "$IMAGE:deploy-bad-migration" - >/dev/null

prepare_stack ""
cp "$ROOT/infra/deploy.sh" "$WORK/"
deploy() { DEPLOY_SKIP_PULL=1 DEPLOY_READY_TIMEOUT=40 "$WORK/deploy.sh" "$@"; }
env_tag() { grep -E '^API_TAG=' "$WORK/.env" | cut -d= -f2; }
running_image() { docker inspect --format '{{.Config.Image}}' "$(compose ps -q api)"; }
snapshots() { find "$WORK/backups" -name 'pre-deploy-*' 2>/dev/null | wc -l | tr -d ' '; }

deploy deploy-a || fail "first deploy"
[ "$(env_tag)" = "deploy-a" ] || fail "API_TAG after first deploy is $(env_tag)"
[ "$(running_image)" = "$IMAGE:deploy-a" ] || fail "running image after first deploy"
wait_ready || fail "not ready after first deploy"
pass "first deploy migrates, starts and records the tag"

deploy deploy-b || fail "second deploy"
[ "$(env_tag)" = "deploy-b" ] || fail "API_TAG after second deploy"
[ "$(cat "$WORK/state/previous-tag")" = "deploy-a" ] || fail "previous-tag after second deploy"
[ "$(snapshots)" -ge 1 ] || fail "no pre-deploy snapshot"
mode() { stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"; }
[ "$(mode "$WORK/backups")" = "700" ] || fail "backups/ must be 700, is $(mode "$WORK/backups")"
[ "$(mode "$WORK/state")" = "700" ] || fail "state/ must be 700"
for dump in "$WORK"/backups/pre-deploy-*; do [ "$(mode "$dump")" = "600" ] || fail "snapshot $dump must be 600, is $(mode "$dump")"; done
pass "second deploy keeps the previous tag and takes a snapshot"

before="$(snapshots)"
if deploy deploy-does-not-exist; then fail "unknown tag deployed"; fi
[ "$(snapshots)" = "$before" ] || fail "unknown tag took a snapshot"
[ "$(running_image)" = "$IMAGE:deploy-b" ] || fail "unknown tag touched the running API"
pass "unknown tag fails before touching anything"

if deploy deploy-bad-migration; then fail "failed migration reported success"; fi
[ "$(env_tag)" = "deploy-b" ] || fail "API_TAG changed after a failed migration"
[ "$(running_image)" = "$IMAGE:deploy-b" ] || fail "failed migration switched the API"
wait_ready || fail "not ready after a failed migration"
pass "failed migration leaves the running API untouched"

if deploy deploy-crashes; then fail "crashing image reported success"; fi
[ "$(env_tag)" = "deploy-b" ] || fail "API_TAG changed after a failed readiness check"
[ "$(running_image)" = "$IMAGE:deploy-b" ] || fail "crashing image was not rolled back"
wait_ready || fail "not ready after rollback"
pass "crashing image is rolled back to the previous tag"

deploy "$(cat "$WORK/state/previous-tag")" || fail "rollback deploy"
[ "$(running_image)" = "$IMAGE:deploy-a" ] || fail "rollback did not run deploy-a"
[ "$(cat "$WORK/state/previous-tag")" = "deploy-b" ] || fail "previous-tag after rollback"
wait_ready || fail "not ready after rollback deploy"
pass "rollback to the previous tag is a normal deploy"

if deploy 'bad tag;rm -rf /'; then fail "invalid tag accepted"; fi
pass "invalid tag rejected"

docker image rm -f "$IMAGE:deploy-a" "$IMAGE:deploy-b" "$IMAGE:deploy-crashes" "$IMAGE:deploy-bad-migration" >/dev/null 2>&1 || true
echo "deploy test passed"
