#!/usr/bin/env node
/**
 * P0-IX-14 closed-loop check (Node Playwright).
 *
 * Goal: Strategy page footer placeholder links must NOT be dead (# without feedback).
 * - 后台动作：点击 footer「服务」中的“战略规划”链接
 * - 前台变化：弹出“暂未开放（vBuild-1.0）”提示（alert/dialog）
 *
 * Evidence: screenshots + console summary (including dialog text).
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
  const dialogs = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    else if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  page.on('dialog', async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });

  const openUrl = `${BASE}/?page=strategy`;
  await page.goto(openUrl, { waitUntil: 'networkidle', timeout: 60_000 });

  // Wait for Strategy page to render (a stable text on the page)
  await page.getByText('合作方式').first().waitFor({ timeout: 30_000 });

  // Scroll to footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(evidenceRoot, 'ix14-strategy-footer.png'), fullPage: true });

  const footer = page.locator('footer');
  await footer.waitFor({ state: 'visible', timeout: 20_000 });
  const link = footer.locator('a', { hasText: '战略规划' }).first();
  await link.waitFor({ state: 'visible', timeout: 20_000 });

  // Trigger dialog
  await link.click({ timeout: 20_000 });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(evidenceRoot, 'ix14-after-click.png'), fullPage: true });

  const finalUrl = page.url();

  await browser.close();

  const dialogText = dialogs.map((d) => d.message).join('\n---\n');

  const summary = {
    base: `${BASE}/`,
    check: 'P0-IX-14_strategy_footer_links_have_feedback',
    evidence_dir: evidenceRoot,
    open: openUrl,
    final_url: finalUrl,
    dialog: {
      count: dialogs.length,
      dialogs,
      text: dialogText,
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
    && dialogs.length >= 1
    && /暂未开放/.test(dialogText)
    && /vBuild-1\.0/.test(dialogText)
    && finalUrl.includes('page=strategy');

  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
