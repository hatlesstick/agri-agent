#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: deploy.sh <image-tag>" >&2; exit 2; }
log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

[ $# -eq 1 ] || usage
TAG="$1"
[[ "$TAG" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] || die "invalid image tag: $TAG"

DIR="${DEPLOY_DIR:-$(cd "$(dirname "$0")" && pwd)}"
READY_TIMEOUT="${DEPLOY_READY_TIMEOUT:-90}"
KEEP_SNAPSHOTS="${DEPLOY_KEEP_SNAPSHOTS:-10}"
cd "$DIR"
umask 077
mkdir -p state backups
chmod 700 state backups

LOCK="state/deploy.lock"
for _ in $(seq 1 600); do
  if mkdir "$LOCK" 2>/dev/null; then break; fi
  sleep 1
done
[ -d "$LOCK" ] && [ ! -f "$LOCK/pid" ] || die "another deploy is running (remove $DIR/$LOCK if it is stale)"
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

env_value() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2-; }
set_env_value() {
  if grep -qE "^$1=" .env; then
    sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak
  else
    echo "$1=$2" >> .env
  fi
}

IMAGE="$(env_value API_IMAGE)"
[ -n "$IMAGE" ] || die "API_IMAGE is not set in $DIR/.env"
CURRENT="$(env_value API_TAG)"

compose_with() { API_TAG="$1" docker compose -f docker-compose.prod.yml "${@:2}"; }

wait_ready() {
  local tag="$1"
  for _ in $(seq 1 "$READY_TIMEOUT"); do
    if compose_with "$tag" exec -T api node -e "fetch('http://127.0.0.1:4000/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

log "image $IMAGE:$TAG (running: ${CURRENT:-none})"
if [ "${DEPLOY_SKIP_PULL:-0}" = "1" ]; then
  docker image inspect "$IMAGE:$TAG" >/dev/null 2>&1 || die "image $IMAGE:$TAG not found"
else
  docker pull -q "$IMAGE:$TAG" >/dev/null || die "cannot pull $IMAGE:$TAG"
fi

compose_with "$TAG" up -d --wait db

SNAPSHOT="backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ)-$TAG.dump"
# shellcheck disable=SC2016
compose_with "$TAG" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$SNAPSHOT" || { rm -f "$SNAPSHOT"; die "snapshot failed"; }
log "snapshot $DIR/$SNAPSHOT"
find backups -name 'pre-deploy-*' -type f | sort -r | tail -n +"$((KEEP_SNAPSHOTS + 1))" | while read -r old; do rm -f "$old"; done

log "migrating"
compose_with "$TAG" run --rm --no-deps api node dist/migrate.js || die "migration failed; the running API is unchanged; snapshot: $DIR/$SNAPSHOT"

log "starting $TAG"
compose_with "$TAG" up -d --remove-orphans
if wait_ready "$TAG"; then
  set_env_value API_TAG "$TAG"
  DROPPED="$(cat state/previous-tag 2>/dev/null || true)"
  if [ -n "$CURRENT" ] && [ "$CURRENT" != "$TAG" ]; then echo "$CURRENT" > state/previous-tag; fi
  if [ -n "$DROPPED" ] && [ "$DROPPED" != "$TAG" ] && [ "$DROPPED" != "$CURRENT" ]; then
    docker image rm "$IMAGE:$DROPPED" >/dev/null 2>&1 || true
  fi
  log "$TAG is live"
  exit 0
fi

compose_with "$TAG" logs --tail 30 api >&2 || true
if [ -z "$CURRENT" ]; then die "$TAG is not ready and there is no previous tag to roll back to"; fi
log "$TAG is not ready; rolling back to $CURRENT"
compose_with "$CURRENT" up -d --remove-orphans
wait_ready "$CURRENT" || die "rollback to $CURRENT is not ready either; snapshot: $DIR/$SNAPSHOT"
die "$TAG failed its readiness check; rolled back to $CURRENT"
