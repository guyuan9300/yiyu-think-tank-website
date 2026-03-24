#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/guyuanyuan/Documents/New project"
SITE_DIR="$ROOT_DIR/projects/yiyu-site-src"
SSH_KEY="/Users/guyuanyuan/.ssh/yiyu_zhiku_2026.pem"
SSH_HOST="134.175.96.251"
SSH_USER="ubuntu"
LOCAL_CONF="$SITE_DIR/ops/nginx/yiyu-site.conf"
REMOTE_CONF="/etc/nginx/sites-enabled/yiyu-site"
REMOTE_AVAILABLE="/etc/nginx/sites-available/yiyu-site"

if [ ! -f "$LOCAL_CONF" ]; then
  echo "Nginx config not found: $LOCAL_CONF" >&2
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

chmod 600 "$SSH_KEY"

echo "[1/3] Uploading Nginx HTTPS config"
scp -i "$SSH_KEY" "$LOCAL_CONF" "$SSH_USER@$SSH_HOST:/tmp/yiyu-site.conf"

echo "[2/3] Publishing Nginx HTTPS config"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
  "sudo install -m 644 /tmp/yiyu-site.conf $REMOTE_CONF && \
   sudo install -m 644 /tmp/yiyu-site.conf $REMOTE_AVAILABLE"

echo "[3/3] Verifying and reloading Nginx"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
  "sudo nginx -t && sudo systemctl reload nginx"

echo "HTTPS Nginx config applied"
