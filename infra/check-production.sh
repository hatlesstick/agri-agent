#!/usr/bin/env bash
# shellcheck disable=SC2015
set -uo pipefail

usage() {
  cat >&2 <<'USAGE'
usage: check-production.sh --api <url> [--web <url>] [--stream] [--skip-ports]
  --api URL      API origin, e.g. https://api.example.com
  --web URL      Vercel web origin; checks the /api rewrite and proxy.ts without a model call
  --stream       also streams one chat answer through --web (and directly when PROXY_AUTH_SECRET is set) — real model calls
  --skip-ports   do not probe 4000/5432/6379 on the API host
USAGE
  exit 2
}

API="" WEB="" STREAM=0 SKIP_PORTS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --api) API="${2:-}"; shift 2 ;;
    --web) WEB="${2:-}"; shift 2 ;;
    --stream) STREAM=1; shift ;;
    --skip-ports) SKIP_PORTS=1; shift ;;
    *) usage ;;
  esac
done
[ -n "$API" ] || usage
API="${API%/}"
WEB="${WEB%/}"
HERE="$(cd "$(dirname "$0")" && pwd)"
FAILURES=0
ok() { echo "ok   - $*"; }
bad() { echo "FAIL - $*"; FAILURES=$((FAILURES + 1)); }
status() { curl -s -o /dev/null -m 15 -w '%{http_code}' "$@"; }
body() { curl -s -m 15 "$@"; }
EMPTY_CHAT='{"messages":[]}'

host="$(echo "$API" | sed -E 's#^[a-z]+://([^/:]+).*#\1#')"

ready="$(body "$API/health/ready")"
if echo "$ready" | grep -q '"database":"ok"'; then ok "API ready, database ok"; else bad "API not ready: ${ready:-no response}"; fi
[ "$(status "$API/health/live")" = "200" ] && ok "API live" || bad "API /health/live"

if [[ "$API" == https://* ]]; then
  expiry="$(echo | openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  if [ -n "$expiry" ]; then
    days=$(( ( $(date -j -f '%b %e %T %Y %Z' "$expiry" +%s 2>/dev/null || date -d "$expiry" +%s) - $(date +%s) ) / 86400 ))
    [ "$days" -ge 14 ] && ok "TLS certificate valid for $days more days" || bad "TLS certificate expires in $days days"
  else
    bad "no TLS certificate"
  fi
  redirect="$(curl -s -o /dev/null -m 15 -w '%{http_code} %{redirect_url}' "http://$host/health/live")"
  [[ "$redirect" =~ ^30[18]\ https:// ]] && ok "HTTP redirects to HTTPS" || bad "HTTP redirect: $redirect"
fi

for route in chat spray-check; do
  [ "$(status -X POST "$API/$route" -H 'content-type: application/json' --data "$EMPTY_CHAT")" = "403" ] && ok "direct /$route without X-Proxy-Auth is 403" || bad "direct /$route without X-Proxy-Auth"
  [ "$(status -X POST "$API/$route" -H 'content-type: application/json' -H 'x-proxy-auth: wrong' --data "$EMPTY_CHAT")" = "403" ] && ok "direct /$route with a wrong X-Proxy-Auth is 403" || bad "direct /$route with a wrong X-Proxy-Auth"
done

headers="$(curl -sI -m 15 "$API/health/live" | tr -d '\r')"
echo "$headers" | grep -qi '^x-content-type-options: nosniff' && echo "$headers" | grep -qi '^x-frame-options: DENY' && ok "security headers present" || bad "security headers missing"
echo "$headers" | grep -qi '^server:' && bad "Server header exposed" || ok "no Server header"

if [ "$SKIP_PORTS" = "0" ]; then
  for port in 4000 5432 6379; do
    if python3 -c "import socket,sys; s=socket.socket(); s.settimeout(4); sys.exit(0 if s.connect_ex(('$host', $port)) == 0 else 1)"; then
      bad "port $port is reachable from outside"
    else
      ok "port $port closed"
    fi
  done
fi

if [ -n "$WEB" ]; then
  [ "$(status "$WEB/")" = "200" ] && ok "web app responds" || bad "web app $WEB/"
  web_ready="$(body "$WEB/api/health/ready")"
  echo "$web_ready" | grep -q '"database":"ok"' && ok "web /api rewrite reaches the API" || bad "web /api/health/ready: ${web_ready:-no response}"
  proxied="$(body -X POST "$WEB/api/chat" -H 'content-type: application/json' -H 'x-proxy-auth: spoofed' --data "$EMPTY_CHAT")"
  echo "$proxied" | grep -q '"code":"invalid_request"' && ok "proxy.ts adds the right X-Proxy-Auth (empty chat → 400, not 403)" || bad "web /api/chat without a model call: ${proxied:-no response}"
fi

if [ "$STREAM" = "1" ]; then
  [ -n "$WEB" ] || { bad "--stream needs --web"; }
  if [ -n "$WEB" ]; then
    python3 "$HERE/smoke/stream-timing.py" "$WEB/api/chat" "unused" "In one short sentence, what is spray drift?" && ok "chat streams incrementally through Vercel" || bad "chat stream through Vercel"
  fi
  if [ -n "${PROXY_AUTH_SECRET:-}" ]; then
    python3 "$HERE/smoke/stream-timing.py" "$API/chat" "$PROXY_AUTH_SECRET" "In one short sentence, what is spray drift?" && ok "chat streams incrementally from the API directly" || bad "direct chat stream"
  fi
fi

if [ "$FAILURES" -gt 0 ]; then echo "$FAILURES check(s) failed"; exit 1; fi
echo "all checks passed"
