#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""P0-IX-06 closed-loop check.

Goal: About 页介绍视频占位弹窗支持深链打开，并在关闭后清理标记。

- Backstage action: open URL with ?page=about&intro=1
- Front change: modal auto-opens (role=dialog, aria-label=介绍视频)
- Front action: click close button (aria-label=关闭)
- Backstage result: URL search no longer contains intro=1

Evidence: screenshots + console summary + URL snapshots.
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

    about_url = BASE.rstrip("/") + "/?page=about&intro=1"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        page.on(
            "console",
            lambda msg: console_errors.append(msg.text)
            if msg.type == "error"
            else (console_warnings.append(msg.text) if msg.type == "warning" else None),
        )

        page.goto(about_url, wait_until="networkidle", timeout=60000)
        page.screenshot(path=str(evidence_root / "ix06-about-entry.png"), full_page=True)

        dialog = page.get_by_role("dialog", name="介绍视频")
        dialog.wait_for(timeout=20000)
        page.screenshot(path=str(evidence_root / "ix06-modal-open.png"), full_page=True)

        url_before = page.evaluate("() => window.location.href")

        # Close via explicit close button
        dialog.get_by_role("button", name="关闭", exact=True).click(timeout=15000)

        # Assert modal closed
        dialog.wait_for(state="detached", timeout=20000)
        page.screenshot(path=str(evidence_root / "ix06-modal-closed.png"), full_page=True)

        url_after = page.evaluate("() => window.location.href")

        save_json(
            evidence_root / "url_snapshots.json",
            {
                "about_url": about_url,
                "url_before_close": url_before,
                "url_after_close": url_after,
            },
        )

        browser.close()

    ok_open = True
    ok_clean = "intro=1" not in url_after

    summary = {
        "base": BASE,
        "check": "P0-IX-06_about_intro_modal_deeplink_and_cleanup",
        "evidence_dir": str(evidence_root),
        "assertions": {
            "modal_auto_open": ok_open,
            "url_cleaned_after_close": ok_clean,
        },
        "console": {
            "error_count": len(console_errors),
            "warning_count": len(console_warnings),
            "errors_sample": console_errors[:10],
            "warnings_sample": console_warnings[:10],
        },
        "ts": time.time(),
    }

    save_json(evidence_root / "console_summary.json", summary)

    if len(console_errors) > 0 or (not ok_clean):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
