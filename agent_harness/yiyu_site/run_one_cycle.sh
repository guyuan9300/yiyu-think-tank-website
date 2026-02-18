#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

NOW="$(date '+%Y-%m-%d %H:%M:%S')"
OUT=$(./init.sh 2>&1 || true)

{
  echo "## ${NOW}"
  echo "- action: init+smoke"
  echo "- result:"
  echo ""
  echo "```"
  echo "${OUT}" | tail -n 120
  echo "```"
  echo ""
} >> progress.log

echo "[cycle] done. progress appended."
