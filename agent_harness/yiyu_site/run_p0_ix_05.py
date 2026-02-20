#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""P0-IX-05 closed-loop check.

Goal: Home 页「订阅前沿」弹窗必须满足：
- 后台动作（localStorage 预置订阅偏好/邮箱 + 赋予可用权限）
- 前台变化：点击「订阅前沿」打开弹窗（role=dialog, aria-label=订阅前沿更新），邮箱输入框预填为后台邮箱
- 前台动作：修改邮箱并点击「保存订阅」
- 后台结果：localStorage.yiyu_subscription_prefs.email 被更新
- 前台可见反馈：按钮文案短暂变为「已保存」

Evidence: screenshots + console summary + localStorage snapshot.
Outputs under: evidence/YYYYMMDD-HHMMSS/
"""

from __future__ import annotations

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any, List

from playwright.sync_api import sync_playwright

BASE = "https://guyuan9300.github.io/yiyu-think-tank-website/"


def ts_dir() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def save_json(p: Path, obj: Any):
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    evidence_root = Path(__file__).resolve().parent / "evidence" / ts_dir()
    evidence_root.mkdir(parents=True, exist_ok=True)

    console_errors: List[str] = []
    console_warnings: List[str] = []

    seed_email = f"e2e-seed-{datetime.now().strftime('%H%M%S')}@example.com"
    updated_email = f"e2e-updated-{datetime.now().strftime('%H%M%S')}@example.com"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        page.on(
            "console",
            lambda msg: console_errors.append(msg.text)
            if msg.type == "error"
            else (console_warnings.append(msg.text) if msg.type == "warning" else None),
        )

        # Backstage seed: make subscription eligible + preset prefs
        page.add_init_script(
            """
            () => {
              try {
                localStorage.setItem('yiyu_is_admin', 'true');
                sessionStorage.setItem('yiyu_is_admin', 'true');
                const prefs = {
                  enabled: true,
                  email: window.__IX05_SEED_EMAIL__,
                  frequency: 'weekly',
                  topics: { insights: true, reports: true, tools: false, strategyUpdates: true },
                  formats: { digest: true, keyTakeaways: true, actionChecklist: false },
                  updatedAt: new Date().toISOString(),
                };
                localStorage.setItem('yiyu_subscription_prefs', JSON.stringify(prefs));
                window.dispatchEvent(new Event('yiyu_data_change'));
              } catch (e) {}
            }
            """.replace("window.__IX05_SEED_EMAIL__", json.dumps(seed_email))
        )

        page.goto(BASE, wait_until="networkidle", timeout=60000)

        # Ensure eligibility + seed prefs again in page context (defensive against init-script timing)
        page.evaluate(
            """
            (seedEmail) => {
              try {
                localStorage.setItem('yiyu_is_admin', 'true');
                sessionStorage.setItem('yiyu_is_admin', 'true');
                const prefs = {
                  enabled: true,
                  email: seedEmail,
                  frequency: 'weekly',
                  topics: { insights: true, reports: true, tools: false, strategyUpdates: true },
                  formats: { digest: true, keyTakeaways: true, actionChecklist: false },
                  updatedAt: new Date().toISOString(),
                };
                localStorage.setItem('yiyu_subscription_prefs', JSON.stringify(prefs));
                window.dispatchEvent(new Event('yiyu_data_change'));
              } catch (e) {}
            }
            """,
            seed_email,
        )

        page.screenshot(path=str(evidence_root / "ix05-home.png"), full_page=True)

        # Front action: open subscription modal
        page.get_by_role("button", name="订阅前沿", exact=True).first.click(timeout=15000)

        dialog = page.get_by_role("dialog", name="订阅前沿更新")
        dialog.wait_for(timeout=20000)
        page.screenshot(path=str(evidence_root / "ix05-subscription-dialog-open.png"), full_page=True)

        # Assert prefilled email from backstage
        email_input = dialog.locator('input[placeholder="name@example.com"]')
        email_input.wait_for(timeout=15000)
        prefill_value = email_input.input_value()

        # Update email and save
        email_input.fill(updated_email)
        dialog.get_by_role("button", name="保存订阅", exact=True).click(timeout=15000)

        # Visible feedback: button becomes 已保存
        dialog.get_by_text("已保存", exact=True).wait_for(timeout=10000)
        page.screenshot(path=str(evidence_root / "ix05-saved.png"), full_page=True)

        # Backstage result: localStorage updated
        storage_raw = page.evaluate("() => localStorage.getItem('yiyu_subscription_prefs')")
        try:
            storage = json.loads(storage_raw) if storage_raw else None
        except Exception:
            storage = None

        save_json(evidence_root / "localstorage_yiyu_subscription_prefs.json", storage)

        browser.close()

    ok_prefill = prefill_value == seed_email
    ok_storage = isinstance(storage, dict) and storage.get("email") == updated_email

    summary = {
        "base": BASE,
        "check": "P0-IX-05_home_subscription_sheet_closed_loop",
        "seed_email": seed_email,
        "updated_email": updated_email,
        "prefill_value": prefill_value,
        "evidence_dir": str(evidence_root),
        "assertions": {
            "dialog_visible": True,
            "prefill_matches_seed_email": ok_prefill,
            "localstorage_email_updated": ok_storage,
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

    if len(console_errors) > 0 or (not ok_prefill) or (not ok_storage):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
