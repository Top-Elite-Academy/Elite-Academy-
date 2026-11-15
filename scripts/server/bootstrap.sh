#!/bin/sh
# =============================================================================
# Prepares a fresh Ubuntu 24.04 server for docker-compose.prod.yml (run as root,
# once). Hetzner runs it automatically from the server's cloud-init "user data";
# on another provider run it by hand:  sudo sh scripts/server/bootstrap.sh
#
#   - security updates installed automatically
#   - SSH: keys only (log in with the provider's web console until you add a key)
#   - firewall: only SSH, HTTP and HTTPS
#   - 4 GB swap (room for building the images and for ClamAV)
#   - Docker Engine + Compose plugin
# Safe to run twice.
# =============================================================================
set -eu
export DEBIAN_FRONTEND=noninteractive

echo "[bootstrap] system updates"
apt-get update -q
apt-get upgrade -yq
apt-get install -yq git curl ca-certificates ufw unattended-upgrades openssl
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "[bootstrap] SSH: keys only"
mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/60-elite-tech.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
systemctl reload ssh || systemctl reload sshd || true

echo "[bootstrap] firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[bootstrap] swap"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -q vm.swappiness=10

echo "[bootstrap] Docker"
if ! command -v docker > /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "[bootstrap] done. Next: cd /opt/elite-tech && ./scripts/server/configure.sh"
