#!/usr/bin/env node
/**
 * P0-IX-12 closed-loop check (Node Playwright).
 *
 * Goal: Unknown ?page=xxx should not silently render Home with a wrong URL.
 * - 后台动作：打开一个未知 page 参数的 URL
 * - 前台变化：出现友好的“页面不存在”提示，并可点击“返回首页”回到首页（URL 变为 base path）
 *
 * Evidence: screenshots + console summary.
 * Outputs under: agent_harness/yiyu_site/evidence/YYYYMMDD-HHMMSS/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = (process.env.YIYU_BASE || 'https://guyuan9300.github.io/yiyu-think-tank-website/').replace(/\/+$/, '');

function tsDir() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf-8');
}

async function main() {
  const evidenceRoot = path.join(__dirname, 'evidence', tsDir());
  fs.mkdirSync(evidenceRoot, { recursive: true });

  const consoleErrors = [];
  const consoleWarnings = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    else if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  const bad = `bad_${Date.now()}`;
  const urlBad = `${BASE}/?page=${encodeURIComponent(bad)}`;
  await page.goto(urlBad, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.screenshot({ path: path.join(evidenceRoot, 'ix12-unknown-page.png'), fullPage: true });

  const notFoundTitle = page.getByText('页面不存在', { exact: true });
  await notFoundTitle.waitFor({ timeout: 20_000 });

  // Click go home
  const goHome = page.getByRole('button', { name: '返回首页' });
  await goHome.click({ timeout: 20_000 });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.screenshot({ path: path.join(evidenceRoot, 'ix12-after-go-home.png'), fullPage: true });

  const finalUrl = page.url();
  const hasHomeNav = await page.getByRole('button', { name: '首页', exact: true }).count();

  await browser.close();

  const summary = {
    base: `${BASE}/`,
    check: 'P0-IX-12_unknown_page_shows_404_and_can_go_home',
    evidence_dir: evidenceRoot,
    open_bad: urlBad,
    bad_page_value: bad,
    final_url: finalUrl,
    ui: {
      home_nav_count: hasHomeNav,
    },
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
    && finalUrl.startsWith(`${BASE}/`)
    && !finalUrl.includes(`page=${encodeURIComponent(bad)}`)
    && hasHomeNav > 0;

  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
