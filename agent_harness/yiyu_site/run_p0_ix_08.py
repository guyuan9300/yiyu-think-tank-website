#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""P0-IX-08 closed-loop check.

Goal: 修复“按钮/链接无功能”——登录页的“服务条款/隐私政策”原为 href="#" 点击无反馈。

- Backstage action: open login page
- Front action: click 服务条款 / 隐私政策
- Front change: show explicit "暂未开放" alert (dialog)

Evidence: screenshots + dialog text + console summary.
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
    dialogs: List[str] = []

    url_open = BASE.rstrip("/") + "/?page=login"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        page.on(
            "console",
            lambda msg: console_errors.append(msg.text)
            if msg.type == "error"
            else (console_warnings.append(msg.text) if msg.type == "warning" else None),
        )

        def on_dialog(d):
            dialogs.append(d.message)
            d.accept()

        page.on("dialog", on_dialog)

        page.goto(url_open, wait_until="networkidle", timeout=60000)
        page.screenshot(path=str(evidence_root / "ix08-entry.png"), full_page=True)

        page.get_by_role("link", name="服务条款", exact=True).click(timeout=20000)
        time.sleep(0.2)

        page.get_by_role("link", name="隐私政策", exact=True).click(timeout=20000)
        time.sleep(0.2)

        page.screenshot(path=str(evidence_root / "ix08-after-click.png"), full_page=True)

        browser.close()

    save_json(
        evidence_root / "dialog_messages.json",
        {
            "open": url_open,
            "dialogs": dialogs,
        },
    )

    ok = (len(dialogs) >= 2) and ("暂未开放" in dialogs[0]) and ("暂未开放" in dialogs[1])

    summary = {
        "base": BASE,
        "check": "P0-IX-08_login_terms_privacy_links_have_feedback",
        "evidence_dir": str(evidence_root),
        "assertions": {
            "dialogs_count_ge_2": len(dialogs) >= 2,
            "dialogs_contain_not_open_yet": ok,
        },
        "dialog_sample": dialogs[:5],
        "console": {
            "error_count": len(console_errors),
            "warning_count": len(console_warnings),
            "errors_sample": console_errors[:10],
            "warnings_sample": console_warnings[:10],
        },
        "ts": time.time(),
    }

    save_json(evidence_root / "console_summary.json", summary)

    if len(console_errors) > 0 or (not ok):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
