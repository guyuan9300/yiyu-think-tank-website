#!/usr/bin/env node
/**
 * P0-IX-13 closed-loop check (Node Playwright).
 *
 * Goal: 修复“同源资源 404”——favicon 不应请求站点根路径的 `/vite.svg`（GitHub Pages project site 下会 404）。
 *
 * Backstage action (code): index.html favicon 改为相对路径 `vite.svg`。
 * Front change: 页面加载期间不出现对 `https://<origin>/vite.svg` 的 404；并且实际 favicon 响应为 200。
 *
 * This check runs against a BASE URL (default GitHub Pages).
 * Evidence: screenshots + network summary + console summary.
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
  const failedRequests = [];
  const viteSvgResponses = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    else if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    failedRequests.push({ url, failure: req.failure() });
  });

  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.toLowerCase().endsWith('/vite.svg') || url.toLowerCase().includes('vite.svg')) {
      viteSvgResponses.push({ url, status: resp.status() });
    }
  });

  const openUrl = `${BASE}/`;
  await page.goto(openUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.screenshot({ path: path.join(evidenceRoot, 'ix13-home.png'), fullPage: true });

  // Extract resolved favicon href from DOM
  const faviconHref = await page.evaluate(() => {
    const el = document.querySelector('link[rel="icon"]');
    return el ? el.getAttribute('href') : null;
  });

  // Make an explicit request for the resolved favicon URL (to ensure 200)
  let faviconResolved = null;
  let faviconStatus = null;
  try {
    if (faviconHref) {
      faviconResolved = new URL(faviconHref, openUrl).toString();
    }
  } catch {
    // ignore
  }

  if (faviconResolved) {
    try {
      const resp = await page.request.get(faviconResolved);
      faviconStatus = resp.status();
    } catch {
      faviconStatus = null;
    }
  }

  await browser.close();

  const origin = new URL(openUrl).origin;
  const rootViteSvg = `${origin}/vite.svg`;

  const sawRootViteSvg404 = viteSvgResponses.some((r) => r.url === rootViteSvg && r.status === 404);

  const summary = {
    base: `${BASE}/`,
    check: 'P0-IX-13_favicon_no_root_vite_svg_404',
    evidence_dir: evidenceRoot,
    open: openUrl,
    favicon: {
      href_attr: faviconHref,
      resolved: faviconResolved,
      status: faviconStatus,
    },
    network: {
      failed_request_count: failedRequests.length,
      failed_requests_sample: failedRequests.slice(0, 20),
      vite_svg_responses: viteSvgResponses,
      root_vite_svg: rootViteSvg,
      saw_root_vite_svg_404: sawRootViteSvg404,
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
    && faviconStatus === 200
    && sawRootViteSvg404 === false;

  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
