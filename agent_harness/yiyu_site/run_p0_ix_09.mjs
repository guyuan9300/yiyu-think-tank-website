#!/usr/bin/env node
/**
 * P0-IX-09 closed-loop check (Node Playwright).
 *
 * Goal: Footer links should navigate to correct pages (not dead / not no-op).
 * - 前台动作：从首页滚动到 footer，依次点击「前沿洞察」「咨询申请」
 * - 前台变化：URL 发生变化并进入对应页面（insights / consult apply）
 *
 * Evidence: screenshots + url assertions + console summary.
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

async function clickFooterLink(page, evidenceRoot, { linkText, shotPrefix, urlMatchers }) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);

  const footer = page.locator('footer');
  await footer.waitFor({ state: 'attached', timeout: 20_000 });
  await footer.scrollIntoViewIfNeeded();
  await footer.waitFor({ state: 'visible', timeout: 20_000 });

  await page.screenshot({ path: path.join(evidenceRoot, `${shotPrefix}-footer-visible.png`), fullPage: true });

  // Footer uses clickable text blocks (not <a>). Find the first *visible* match.
  const candidates = footer.getByText(linkText);
  const n = await candidates.count();
  if (n === 0) throw new Error(`No footer element matches: ${linkText}`);

  let link = candidates.first();
  for (let i = 0; i < n; i++) {
    const c = candidates.nth(i);
    // eslint-disable-next-line no-await-in-loop
    if (await c.isVisible()) { link = c; break; }
  }

  await link.scrollIntoViewIfNeeded();

  const beforeUrl = page.url();
  await link.click({ timeout: 20_000 });

  let matched = false;
  for (const m of urlMatchers) {
    try {
      await page.waitForURL(m, { timeout: 20_000 });
      matched = true;
      break;
    } catch {
      // try next matcher
    }
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidenceRoot, `${shotPrefix}-after-click.png`), fullPage: true });

  return {
    before_url: beforeUrl,
    after_url: page.url(),
    url_matched: matched,
  };
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

  const homeUrl = `${BASE}/`;
  await page.goto(homeUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.screenshot({ path: path.join(evidenceRoot, 'ix09-home-entry.png'), fullPage: true });

  // 1) insights
  const r1 = await clickFooterLink(page, evidenceRoot, {
    // In current build footer column uses “行业洞察” entry.
    linkText: /行业洞察|前沿洞察/,
    shotPrefix: 'ix09-insights',
    urlMatchers: [
      '**?page=insights',
      '**?page=insights**',
      '**insights**',
    ],
  });

  // Some routes (e.g. insights) render without footer; return to home for the next footer action.
  await page.goto(homeUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(300);

  // 2) consult apply
  // In current build footer uses “预约对话” (maps to consult-apply).
  const r2 = await clickFooterLink(page, evidenceRoot, {
    linkText: /预约对话|咨询申请|申请咨询/,
    shotPrefix: 'ix09-consult',
    urlMatchers: [
      '**?page=consult-apply',
      '**consult-apply**',
      '**consult**',
      '**apply**',
    ],
  });

  await browser.close();

  const summary = {
    base: `${BASE}/`,
    check: 'P0-IX-09_footer_links_navigate',
    evidence_dir: evidenceRoot,
    assertions: {
      navigated_to_insights: r1.url_matched && r1.after_url !== r1.before_url,
      navigated_to_consult_apply: r2.url_matched && r2.after_url !== r2.before_url,
    },
    urls: {
      insights: r1,
      consult_apply: r2,
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
    && summary.assertions.navigated_to_insights
    && summary.assertions.navigated_to_consult_apply;

  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
