#!/usr/bin/env node
/**
 * P0-IX-10 closed-loop check (Node Playwright).
 *
 * Goal: 修复路由别名缺失 —— 访问 `?page=learning` 时不应落到首页/空白，
 * 应兼容为学习中心（canonical: `?page=library`）。
 *
 * Backstage action (code): App 初始化时将 page=learning 归一化到 library。
 * Front action: 直接访问带参数的 URL。
 * Front change: 页面展示学习中心内容，且 URL 被 replaceState 归一化为 `?page=library`。
 *
 * Evidence: screenshots + url + console summary.
 * Outputs under: evidence/YYYYMMDD-HHMMSS/
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

  const urlOpen = `${BASE}/?page=learning`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    else if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  await page.goto(urlOpen, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.screenshot({ path: path.join(evidenceRoot, 'ix10-entry-learning-param.png'), fullPage: true });

  try {
    await page.waitForURL('**?page=library', { timeout: 20_000 });
  } catch {
    // keep going; we will record final_url + assertions
  }

  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(evidenceRoot, 'ix10-after-normalize.png'), fullPage: true });

  // Assert a stable piece of Library page content exists
  let okContent = false;
  try {
    await page.getByText('书库 · 精选书籍提炼 · 知识精华萃取', { exact: true }).first().waitFor({ timeout: 15_000 });
    okContent = true;
  } catch {
    okContent = false;
  }

  const finalUrl = page.url();
  await browser.close();

  const summary = {
    base: `${BASE}/`,
    check: 'P0-IX-10_learning_alias_routes_to_library',
    evidence_dir: evidenceRoot,
    open: urlOpen,
    final_url: finalUrl,
    assertions: {
      final_url_contains_page_library: finalUrl.includes('?page=library'),
      library_content_visible: okContent,
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

  const ok = consoleErrors.length === 0 && summary.assertions.final_url_contains_page_library && okContent;
  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
