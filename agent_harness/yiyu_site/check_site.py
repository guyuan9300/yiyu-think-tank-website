#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""Smoke checks for the deployed Yiyu Think Tank site (SPA).

Uses Playwright to verify rendered UI + surface console/network issues.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import List

import requests
from playwright.sync_api import sync_playwright

BASE = "https://guyuan9300.github.io/yiyu-think-tank-website/"
NAV_WORDS = ["首页", "前沿洞察", "战略陪伴", "学习中心", "关于我们"]


@dataclass
class Result:
    ok: bool
    name: str
    details: str = ""


def check_http_entry() -> Result:
    try:
        r = requests.get(BASE, timeout=30)
        return Result(r.status_code == 200, "home_http", f"status={r.status_code}")
    except Exception as e:
        return Result(False, "home_http", f"error={e}")


def check_dom_and_console() -> Result:
    console_errors: List[str] = []
    failed_requests: List[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on(
            "console",
            lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
        )
        page.on(
            "requestfailed",
            lambda req: failed_requests.append(
                f"{req.method} {req.url} failure={req.failure}"
            ),
        )

        resp = page.goto(BASE, wait_until="networkidle", timeout=60000)
        status = resp.status if resp else None

        for w in NAV_WORDS:
            page.get_by_role("button", name=w, exact=True).first.wait_for(timeout=20000)

        missing = [
            w for w in NAV_WORDS if page.get_by_role("button", name=w, exact=True).count() == 0
        ]

        # Check template artifact /vite.svg under the *site base path* (GitHub Pages project site).
        # Previously we checked the user/organization root (https://guyuan9300.github.io/vite.svg),
        # which is expected to 404 and produced a false alarm.
        from urllib.parse import urljoin

        vite_url = urljoin(BASE, "vite.svg")
        vite = page.request.get(vite_url)
        vite_status = vite.status

        browser.close()

    details = {
        "status": status,
        "missing_nav": missing,
        "vite_svg_url": vite_url,
        "vite_svg_status": vite_status,
        "console_error_count": len(console_errors),
        "failed_request_count": len(failed_requests),
        "console_errors_sample": console_errors[:5],
        "failed_requests_sample": failed_requests[:5],
    }

    if missing:
        return Result(False, "dom_nav_missing", json.dumps(details, ensure_ascii=False))

    # warning only
    if vite_status >= 400:
        return Result(True, "warning_vite_svg_404", json.dumps(details, ensure_ascii=False))

    if console_errors:
        return Result(False, "console_errors", json.dumps(details, ensure_ascii=False))

    return Result(True, "dom_ok", json.dumps(details, ensure_ascii=False))


def main() -> int:
    results: List[Result] = [check_http_entry(), check_dom_and_console()]
    ok = all(r.ok for r in results)
    out = {"ok": ok, "base": BASE, "results": [r.__dict__ for r in results]}
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
