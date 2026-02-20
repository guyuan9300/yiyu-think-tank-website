#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""P0-IX-07 closed-loop check.

Goal: 咨询申请（备用表单）提交后给出可执行“下一步”落点，并在 URL 打标记，便于用户回看 + E2E 断言。

- Backstage action: open consult apply page
- Front action: use fallback form, fill minimal required fields, submit
- Front change: show "已提交" done panel + "发送邮件（备选落点）" link
- Backstage result: URL contains submitted=1 and rid=...

Evidence: screenshots + URL snapshots + console summary.
Outputs under: evidence/YYYYMMDD-HHMMSS/

Usage:
  BASE can be overridden via env var (defaults to GitHub Pages).
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, List

from playwright.sync_api import sync_playwright

BASE = os.environ.get("YIYU_BASE", "https://guyuan9300.github.io/yiyu-think-tank-website/")


def ts_dir() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def save_json(p: Path, obj: Any):
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    evidence_root = Path(__file__).resolve().parent / "evidence" / ts_dir()
    evidence_root.mkdir(parents=True, exist_ok=True)

    console_errors: List[str] = []
    console_warnings: List[str] = []

    url_open = BASE.rstrip("/") + "/?page=consult-apply"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        page.on(
            "console",
            lambda msg: console_errors.append(msg.text)
            if msg.type == "error"
            else (console_warnings.append(msg.text) if msg.type == "warning" else None),
        )

        page.goto(url_open, wait_until="networkidle", timeout=60000)
        page.screenshot(path=str(evidence_root / "ix07-entry.png"), full_page=True)

        # Choose fallback form
        page.get_by_role("button", name="使用备用表单", exact=True).click(timeout=20000)

        # Fill minimal required fields on contact step
        page.get_by_placeholder("怎么称呼你").fill("自动化测试")
        page.get_by_placeholder("用于接收后续材料/开票（如后续购买）").fill("test@example.com")

        # Next to core problem (use last to avoid strict-mode collision with multiple "下一步" buttons)
        page.get_by_role("button", name="下一步").last.click(timeout=15000)

        # Fill core problem (>=15 chars)
        page.get_by_placeholder("至少 15 个字").fill("希望优化战略咨询申请的提交落点与反馈")

        # Navigate to submit confirm
        page.get_by_role("button", name="下一步").last.click(timeout=15000)  # context
        page.get_by_role("button", name="下一步").last.click(timeout=15000)  # commitment
        page.get_by_role("button", name="下一步").last.click(timeout=15000)  # submit

        page.screenshot(path=str(evidence_root / "ix07-before-submit.png"), full_page=True)

        page.get_by_role("button", name="确认提交", exact=True).click(timeout=20000)

        # Done state
        page.get_by_role("heading", name="已提交，我们会尽快处理", exact=True).wait_for(timeout=20000)
        page.get_by_role("link", name="发送邮件（备选落点）", exact=True).wait_for(timeout=20000)

        page.screenshot(path=str(evidence_root / "ix07-done.png"), full_page=True)

        url_after = page.evaluate("() => window.location.href")

        save_json(
            evidence_root / "url_snapshots.json",
            {
                "open": url_open,
                "url_after": url_after,
            },
        )

        browser.close()

    ok_url = ("submitted=1" in url_after) and ("rid=" in url_after)

    summary = {
        "base": BASE,
        "check": "P0-IX-07_consult_apply_submit_has_next_step_and_url_marker",
        "evidence_dir": str(evidence_root),
        "assertions": {
            "done_panel_visible": True,
            "mailto_link_visible": True,
            "url_contains_submitted_and_rid": ok_url,
        },
        "console": {
            "error_count": len(console_errors),
            "warning_count": len(console_warnings),
            "errors_sample": console_errors[:10],
            "warnings_sample": console_warnings[:10],
        },
        "url_after": url_after,
        "ts": time.time(),
    }

    save_json(evidence_root / "console_summary.json", summary)

    if len(console_errors) > 0 or (not ok_url):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
