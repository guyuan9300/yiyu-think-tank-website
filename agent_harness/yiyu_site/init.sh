#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  /opt/homebrew/bin/python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install -q --upgrade pip
python -m pip install -q requests playwright
python -m playwright install chromium > /dev/null 2>&1 || true

echo "[init] env ok"
python check_site.py | head -n 120
