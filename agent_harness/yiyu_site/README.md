# Yiyu Think Tank – Long-running Agent Harness (Demo)

Base URL:
- https://guyuan9300.github.io/yiyu-think-tank-website/

Artifacts (per Anthropic long-running harness pattern):
- `feature_list.json`: structured checklist, only update `passes`.
- `progress.log`: append-only progress notes.
- `init.sh`: create local venv + install deps + run smoke.
- `check_site.py`: Playwright-based SPA checks.
- `run_one_cycle.sh`: one cycle runner (init → check → append progress).
