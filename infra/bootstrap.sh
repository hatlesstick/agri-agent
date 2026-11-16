#!/usr/bin/env bash
set -euo pipefail

KEYS_FROM="${BOOTSTRAP_KEYS_FROM:-ubuntu}"
DEPLOY_USER="${BOOTSTRAP_DEPLOY_USER:-deploy}"
APP_DIR="${BOOTSTRAP_APP_DIR:-/opt/agri-agent}"
IN_CONTAINER="${BOOTSTRAP_IN_CONTAINER:-0}"
export DEBIAN_FRONTEND=noninteractive

log() { echo "[bootstrap] $*"; }
die() { echo "[bootstrap] ERROR: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root: ssh ${KEYS_FROM}@<host> 'sudo bash -s' < infra/bootstrap.sh"
# shellcheck source=/dev/null
# shellcheck source=/dev/null
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || die "Ubuntu expected, found ${ID:-unknown}"
SOURCE_KEYS="$(getent passwd "$KEYS_FROM" | cut -d: -f6)/.ssh/authorized_keys"
[ -s "$SOURCE_KEYS" ] || die "$SOURCE_KEYS is empty: add your SSH key to $KEYS_FROM first"

log "packages"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw unattended-upgrades openssh-server >/dev/null

log "docker engine"
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null

log "user $DEPLOY_USER"
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SOURCE_KEYS" "/home/$DEPLOY_USER/.ssh/authorized_keys"

log "app directory $APP_DIR"
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/state" "$APP_DIR/backups"

log "ssh: keys only, no root"
cat > /etc/ssh/sshd_config.d/10-agri-hardening.conf <<'SSHD'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 4
SSHD
for file in /etc/ssh/sshd_config.d/*.conf; do
  [ "$file" = /etc/ssh/sshd_config.d/10-agri-hardening.conf ] && continue
  sed -i -E 's/^\s*(PasswordAuthentication|KbdInteractiveAuthentication|PermitRootLogin)\s+yes/# &/I' "$file"
done
mkdir -p /run/sshd
sshd -t || die "sshd config is invalid; nothing reloaded"

log "firewall: 22, 80, 443"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null

log "unattended security upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT

if [ "$IN_CONTAINER" = "1" ]; then
  log "container mode: services not restarted, firewall not enabled"
else
  systemctl enable --now docker >/dev/null
  systemctl reload ssh
  ufw --force enable >/dev/null
  systemctl enable --now unattended-upgrades >/dev/null
fi

log "done: log in as ${DEPLOY_USER}@<host>"
