#!/usr/bin/env bash
set -euo pipefail

main() {
  [ $# -eq 1 ] || { echo "usage: deploy.sh <image-tag>" >&2; exit 2; }
  TAG="$1"
  [[ "$TAG" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] || { echo "[deploy] ERROR: invalid image tag: $TAG" >&2; exit 1; }

  DIR="${DEPLOY_DIR:-$(cd "$(dirname "$0")" && pwd)}"
  READY_TIMEOUT="${DEPLOY_READY_TIMEOUT:-90}"
  KEEP_SNAPSHOTS="${DEPLOY_KEEP_SNAPSHOTS:-10}"
  [ "$KEEP_SNAPSHOTS" -ge 1 ] 2>/dev/null || KEEP_SNAPSHOTS=1
  cd "$DIR"
  umask 077
  mkdir -p state backups
  chmod 700 state backups

  trap '' HUP PIPE
  exec 3>&1
  exec >state/deploy.log 2>&1

  acquire_lock
  trap 'rm -rf "$LOCK"' EXIT

  [ -f .env ] || die "$DIR/.env is missing"
  IMAGE="$(env_value API_IMAGE)"
  [ -n "$IMAGE" ] || die "API_IMAGE is not set in $DIR/.env"
  CURRENT="$(env_value API_TAG)"

  log "image $IMAGE:$TAG (running: ${CURRENT:-none})"
  if [ "${DEPLOY_SKIP_PULL:-0}" = "1" ]; then
    docker image inspect "$IMAGE:$TAG" >/dev/null 2>&1 || die "image $IMAGE:$TAG not found"
  else
    docker pull -q "$IMAGE:$TAG" || die "cannot pull $IMAGE:$TAG"
  fi

  CADDY_SHA="$(file_sha Caddyfile)"
  if [ "$CADDY_SHA" != "$(cat state/caddyfile.sha 2>/dev/null || true)" ]; then
    compose_with "$TAG" run --rm --no-deps -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || die "Caddyfile is invalid; nothing changed"
    CADDY_CHANGED=1
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
    record_success
    if [ "${CADDY_CHANGED:-0}" = "1" ]; then
      compose_with "$TAG" up -d --no-deps --force-recreate caddy || die "$TAG is live, but Caddy did not restart with the new Caddyfile"
      caddy_up=0
      for _ in $(seq 1 30); do
        if compose_with "$TAG" exec -T caddy wget -q -O /dev/null http://127.0.0.1:2019/config/ >/dev/null 2>&1; then caddy_up=1; break; fi
        sleep 1
      done
      [ "$caddy_up" = "1" ] || die "$TAG is live, but Caddy is not running after the Caddyfile change"
      echo "$CADDY_SHA" > state/caddyfile.sha
      log "Caddy restarted with the updated Caddyfile"
    fi
    log "$TAG is live"
    exit 0
  fi

  compose_with "$TAG" logs --tail 30 api || true
  [ -n "$CURRENT" ] || die "$TAG is not ready and there is no previous tag to roll back to; snapshot: $DIR/$SNAPSHOT"
  log "$TAG is not ready; rolling back to $CURRENT"
  compose_with "$CURRENT" up -d --remove-orphans
  wait_ready "$CURRENT" || die "rollback to $CURRENT is not ready either; snapshot: $DIR/$SNAPSHOT"
  die "$TAG failed its readiness check; rolled back to $CURRENT (migrations of $TAG stay applied; snapshot: $DIR/$SNAPSHOT)"
}

say() { echo "$*"; /bin/echo "$*" >&3 2>/dev/null || true; }
log() { say "[deploy] $*"; }
die() {
  say "[deploy] ERROR: $*"
  tail -n 40 state/deploy.log >&3 2>/dev/null || true
  exit 1
}

acquire_lock() {
  LOCK="state/deploy.lock"
  local acquired=0
  for _ in $(seq 1 600); do
    if mkdir "$LOCK" 2>/dev/null; then acquired=1; break; fi
    sleep 1
  done
  [ "$acquired" = "1" ] || die "another deploy is running (remove $DIR/$LOCK if it is stale)"
  echo $$ > "$LOCK/pid"
}

env_value() { { grep -E "^$1=" .env || true; } | tail -n 1 | cut -d= -f2-; }
set_env_value() {
  if grep -qE "^$1=" .env; then
    sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak
  else
    echo "$1=$2" >> .env
  fi
}

file_sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }

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

record_success() {
  local dropped
  dropped="$(cat state/previous-tag 2>/dev/null || true)"
  set_env_value API_TAG "$TAG"
  if [ -n "$CURRENT" ] && [ "$CURRENT" != "$TAG" ]; then
    echo "$CURRENT" > state/previous-tag
    if [ -n "$dropped" ] && [ "$dropped" != "$TAG" ] && [ "$dropped" != "$CURRENT" ]; then
      log "removing image $IMAGE:$dropped"
      docker image rm "$IMAGE:$dropped" || log "could not remove $IMAGE:$dropped"
    fi
  fi
  if [ "${DEPLOY_PRUNE_DANGLING:-1}" = "1" ]; then docker image prune -f || true; fi
}

main "$@"
