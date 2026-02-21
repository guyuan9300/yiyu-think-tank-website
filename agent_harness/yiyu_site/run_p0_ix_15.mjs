#!/usr/bin/env node
/**
 * P0-IX-15 closed-loop check (Node Playwright).
 *
 * Goal: 修复“按钮/链接无功能”——注册页的“服务条款/隐私政策”原为 href="#" 点击无反馈。
 * - 后台动作：点击注册页的“服务条款”“隐私政策”
 * - 前台变化：弹出“暂未开放（vBuild-1.0）”提示（alert/dialog），且不会发生页面跳转。
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

  const openUrl = `${BASE}/?page=register`;
  await page.goto(openUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // 页面文案在不同构建版本里可能从「创建账户」调整为「加入益语智库」等。
  // 这里用“关键可交互元素存在”来判定注册页已渲染，避免因标题文案变更导致误报失败。
  await page.getByRole('link', { name: '服务条款' }).waitFor({ timeout: 30_000 });

  await page.screenshot({ path: path.join(evidenceRoot, 'ix15-register-before.png'), fullPage: true });

  const urlBefore = page.url();

  // Click 服务条款
  await page.getByRole('link', { name: '服务条款' }).click({ timeout: 20_000 });
  await page.waitForTimeout(300);

  // Click 隐私政策
  await page.getByRole('link', { name: '隐私政策' }).click({ timeout: 20_000 });
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(evidenceRoot, 'ix15-register-after-clicks.png'), fullPage: true });

  const urlAfter = page.url();

  await browser.close();

  const dialogText = dialogs.map((d) => d.message).join('\n---\n');

  const summary = {
    base: `${BASE}/`,
    check: 'P0-IX-15_register_terms_privacy_links_have_feedback',
    evidence_dir: evidenceRoot,
    open: openUrl,
    url: { before: urlBefore, after: urlAfter },
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
    && dialogs.length >= 2
    && /暂未开放/.test(dialogText)
    && /vBuild-1\.0/.test(dialogText)
    && urlBefore === urlAfter
    && urlAfter.includes('page=register');

  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
