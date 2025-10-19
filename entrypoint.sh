#!/usr/bin/env bash
set -euo pipefail

# Seed examples if workspace is empty
if [ -z "$(ls -A /workspace 2>/dev/null || true)" ]; then
  echo "[bootstrap] Seeding /workspace with examples..."
  cp -R /opt/examples/* /workspace/
fi
[ -f /workspace/.bootstrapped ] || touch /workspace/.bootstrapped

# Start code-server
echo "[code-server] Starting at 0.0.0.0:8443 (auth=password)"
code-server /workspace --bind-addr 0.0.0.0:8443 --auth=password &

# Start manager
echo "[manager] Starting Node/Python bot supervisor..."
exec node /opt/manager/manager.js
