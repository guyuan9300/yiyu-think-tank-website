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
  echo '```'
  # NOTE: piping multi-line JSON through echo can get weird in some shells;
  # write to a temp file then tail for stability.
  _tmp_out="$(mktemp)"
  printf '%s\n' "${OUT}" > "${_tmp_out}"
  tail -n 120 "${_tmp_out}"
  rm -f "${_tmp_out}"
  echo '```'
  echo ""
} >> progress.log

echo "[cycle] done. progress appended."
