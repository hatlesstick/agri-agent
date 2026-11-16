#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NAME="agri-bootstrap-test-$$"
fail() { echo "BOOTSTRAP FAIL: $*" >&2; exit 1; }
pass() { echo "ok - $*"; }
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

[ -f "$ROOT/infra/bootstrap.sh" ] || fail "infra/bootstrap.sh is missing"

docker run -d --name "$NAME" -v "$ROOT/infra/bootstrap.sh:/root/bootstrap.sh:ro" ubuntu:24.04 sleep infinity >/dev/null
on_host() { docker exec "$NAME" bash -c "$1"; }
on_host 'id ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu; mkdir -p /home/ubuntu/.ssh && echo "ssh-ed25519 AAAATEST test@example" > /home/ubuntu/.ssh/authorized_keys'

on_host 'BOOTSTRAP_IN_CONTAINER=1 bash /root/bootstrap.sh' > /dev/null || fail "first run"
pass "first run completes"
on_host 'BOOTSTRAP_IN_CONTAINER=1 bash /root/bootstrap.sh' > /dev/null || fail "second run"
pass "second run is idempotent"

on_host 'id deploy | grep -q "(docker)"' || fail "deploy is not in the docker group"
on_host 'cmp /home/ubuntu/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys' || fail "deploy has a different authorized_keys"
[ "$(on_host 'stat -c "%U %a" /home/deploy/.ssh/authorized_keys')" = "deploy 600" ] || fail "authorized_keys owner/mode"
pass "deploy user with the same SSH key and docker group"

on_host '! id -nG deploy | grep -qw sudo' || fail "deploy must not be a sudoer"
pass "deploy has no sudo"

on_host 'sshd -t' || fail "sshd config invalid"
on_host 'sshd -T | grep -qx "passwordauthentication no"' || fail "password login still enabled"
on_host 'sshd -T | grep -qx "permitrootlogin no"' || fail "root login still enabled"
on_host 'sshd -T | grep -qx "kbdinteractiveauthentication no"' || fail "keyboard-interactive still enabled"
pass "sshd allows keys only and no root"

on_host 'docker --version && docker compose version' > /dev/null || fail "docker or compose plugin missing"
pass "docker engine and compose plugin installed"

on_host 'grep -q "^-A ufw-user-input -p tcp --dport 22 -j ACCEPT" /etc/ufw/user.rules && grep -q "dport 80 " /etc/ufw/user.rules && grep -q "dport 443 " /etc/ufw/user.rules' || fail "ufw rules for 22/80/443 missing"
on_host 'grep -q "DEFAULT_INPUT_POLICY=\"DROP\"" /etc/default/ufw' || fail "ufw default input policy is not DROP"
pass "ufw allows only 22, 80, 443"

on_host 'grep -q "Unattended-Upgrade \"1\"" /etc/apt/apt.conf.d/20auto-upgrades' || fail "unattended-upgrades not enabled"
pass "unattended security upgrades enabled"

[ "$(on_host 'stat -c "%U %a" /opt/agri-agent /opt/agri-agent/state /opt/agri-agent/backups' | tr '\n' ' ')" = "deploy 750 deploy 700 deploy 700 " ] || fail "/opt/agri-agent layout"
pass "/opt/agri-agent owned by deploy"

echo "bootstrap test passed"
