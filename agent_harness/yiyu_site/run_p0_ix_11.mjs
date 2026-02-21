#!/usr/bin/env node
/**
 * P0-IX-11 closed-loop check (Node Playwright).
 *
 * Goal: 报告详情页“下载报告”按钮必须有真实落点：
 * - 后台动作：点击“下载报告”后，downloads 计数 +1（localStorage 持久化）
 * - 前台变化：页面显示“次下载”计数变化；并打开 PDF 新标签页（200）
 *
 * Evidence: screenshots + console summary + popup PDF response status.
 * Outputs under: evidence/YYYYMMDD-HHMMSS/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = (process.env.YIYU_BASE || 'https://guyuan9300.github.io/yiyu-think-tank-website/').replace(/\/+$/, '');
const REPORT_ID = process.env.YIYU_REPORT_ID || 'r_weiaiqianxing_training_20260105';

function tsDir() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf-8');
}

function parseDownloads(text) {
  // e.g. "420 次下载"
  const m = text.replace(/,/g, '').match(/(\d+)\s*次下载/);
  return m ? Number(m[1]) : null;
}

async function main() {
  const evidenceRoot = path.join(__dirname, 'evidence', tsDir());
  fs.mkdirSync(evidenceRoot, { recursive: true });

  const consoleErrors = [];
  const consoleWarnings = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Ensure download button is actionable (simulate logged-in paid member)
  await page.addInitScript(() => {
    const user = {
      id: 'e2e_user_gold',
      name: 'E2E Gold',
      memberType: 'gold',
      status: 'active',
    };
    try { window.localStorage.setItem('yiyu_current_user', JSON.stringify(user)); } catch {}
    try { window.sessionStorage.setItem('yiyu_current_user', JSON.stringify(user)); } catch {}
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    else if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  const urlOpen = `${BASE}/?page=report&id=${encodeURIComponent(REPORT_ID)}`;
  await page.goto(urlOpen, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.screenshot({ path: path.join(evidenceRoot, 'ix11-report-detail-entry.png'), fullPage: true });

  const downloadsLine = page.getByText(/次下载/).first();
  await downloadsLine.waitFor({ timeout: 20_000 });
  const beforeText = (await downloadsLine.innerText()).trim();
  const before = parseDownloads(beforeText);

  // Click download and capture popup
  const downloadBtn = page.getByRole('button', { name: /下载(PDF|报告)/ });

  const popupPromise = page.waitForEvent('popup', { timeout: 20_000 }).catch(() => null);
  await downloadBtn.click({ timeout: 20_000 });

  // Wait for downloads number to bump
  let afterText = beforeText;
  let after = before;
  const start = Date.now();
  while (Date.now() - start < 15_000) {
    afterText = (await downloadsLine.innerText()).trim();
    after = parseDownloads(afterText);
    if (before != null && after != null && after === before + 1) break;
    await page.waitForTimeout(250);
  }

  await page.screenshot({ path: path.join(evidenceRoot, 'ix11-after-click-download.png'), fullPage: true });

  const popup = await popupPromise;
  let pdf = { opened: false, url: null, status: null, resolved_pdf_url: null };
  if (popup) {
    pdf.opened = true;

    // Wait for the popup to reach either the proxy page or the PDF itself.
    try {
      await popup.waitForLoadState('domcontentloaded', { timeout: 20_000 });
    } catch {
      // ignore
    }

    pdf.url = popup.url();

    // Resolve real PDF URL:
    // - If popup is on /download-proxy.html?src=..., use src.
    // - Else if popup URL already ends with .pdf, use it.
    let resolved = null;
    try {
      const u = new URL(pdf.url);
      if (u.pathname.endsWith('/download-proxy.html')) {
        const src = u.searchParams.get('src');
        if (src) resolved = new URL(src, u.origin).toString();
      } else if (u.pathname.toLowerCase().endsWith('.pdf') || u.href.toLowerCase().includes('.pdf')) {
        resolved = u.toString();
      }
    } catch {
      // ignore
    }

    pdf.resolved_pdf_url = resolved;

    // Validate a real network target exists (200) using Playwright request API.
    if (resolved) {
      try {
        const resp = await context.request.get(resolved);
        pdf.status = resp.status();
      } catch {
        pdf.status = null;
      }
    }

    await popup.screenshot({ path: path.join(evidenceRoot, 'ix11-popup-pdf.png'), fullPage: true }).catch(() => {});
  }

  await browser.close();

  const summary = {
    base: `${BASE}/`,
    check: 'P0-IX-11_report_detail_download_button_has_real_target',
    evidence_dir: evidenceRoot,
    open: urlOpen,
    downloads: { before_text: beforeText, before, after_text: afterText, after },
    pdf,
    console: {
      error_count: consoleErrors.length,
      warning_count: consoleWarnings.length,
      errors_sample: consoleErrors.slice(0, 10),
      warnings_sample: consoleWarnings.slice(0, 10),
    },
    ts: Date.now() / 1000,
  };

  writeJson(path.join(evidenceRoot, 'console_summary.json'), summary);

  const ok = consoleErrors.length === 0
    && before != null
    && after != null
    && after === before + 1
    && pdf.opened === true
    && pdf.status === 200;

  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
