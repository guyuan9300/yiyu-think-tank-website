/**
 * Capture real screenshots of the 益语智库 workbench — v3.
 *
 * Improvements:
 *   - Taller viewport (1440×1050) to avoid clipping text
 *   - Waits for content to fully render before capture
 *   - Captures purpose-specific views that match value propositions
 *
 * Usage:
 *   YIYU_EMAIL=xxx YIYU_PASSWORD=xxx node scripts/capture-workbench-screenshots.mjs
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT_DIR = join(import.meta.dirname, '..', 'public', 'images', 'workbench');
mkdirSync(OUT_DIR, { recursive: true });

const APP_URL = 'http://127.0.0.1:4173';
const EMAIL = process.env.YIYU_EMAIL || '';
const PASSWORD = process.env.YIYU_PASSWORD || '';

if (!EMAIL || !PASSWORD) {
  console.log('Set YIYU_EMAIL and YIYU_PASSWORD env vars.');
  process.exit(1);
}

async function waitForStable(page, ms = 2000) {
  await page.waitForTimeout(ms);
  // Wait for any remaining network requests
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

async function clickNav(page, label, timeout = 5000) {
  const btn = page.locator(`button:has-text("${label}")`).first();
  await btn.click({ timeout });
}

async function capture(page, name, description) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${name}.png — ${description}`);
}

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },  // Taller to avoid clipping
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Load & login
  console.log('Loading app...');
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const body = await page.textContent('body');
  if (!body.includes('退出登录')) {
    console.log('Logging in...');
    await page.locator('input[type="text"], input[type="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button:has-text("进入系统"), button:has-text("登录")').first().click();
    await page.waitForTimeout(6000);
    console.log('Login complete.');
  }

  // -----------------------------------------------------------------------
  // 1. Hero: 任务列表 — 完整任务列表，事件线标签可见
  // -----------------------------------------------------------------------
  console.log('\n[Hero / 任务列表]');
  try {
    await clickNav(page, '任务与日程');
    await waitForStable(page, 1500);
    await clickNav(page, '任务列表');
    await waitForStable(page, 2500);
    // Scroll main content area to top to ensure tasks are fully visible
    await page.evaluate(() => {
      const main = document.querySelector('main') || document.documentElement;
      main.scrollTop = 0;
    });
    await page.waitForTimeout(500);
    await capture(page, 'tasks-overview', '任务列表全貌，事件线标签可见');
  } catch (e) { console.log(`  ✗ ${e.message.split('\n')[0]}`); }

  // -----------------------------------------------------------------------
  // 2. Value 1 — 事件线：任务列表中能看到事件线归属
  //    Same as tasks-overview but saved as task-list for the value section
  // -----------------------------------------------------------------------
  console.log('\n[事件线价值 — 任务列表]');
  try {
    // Already on task list. Just re-capture with a scroll to show event line tags
    await capture(page, 'task-list', '任务列表——事件线归属标签');
  } catch (e) { console.log(`  ✗ ${e.message.split('\n')[0]}`); }

  // -----------------------------------------------------------------------
  // 3. Value 2 — 周复盘：完整复盘页，事件线摘要可见
  // -----------------------------------------------------------------------
  console.log('\n[周复盘价值]');
  try {
    await clickNav(page, '周复盘');
    await waitForStable(page, 3000);
    // Scroll down slightly to show the event line section and analysis
    await page.evaluate(() => {
      const main = document.querySelector('main') || document.documentElement;
      main.scrollTop = 0;
    });
    await page.waitForTimeout(500);
    await capture(page, 'weekly-review', '周复盘——组织复盘+事件线摘要');
  } catch (e) { console.log(`  ✗ ${e.message.split('\n')[0]}`); }

  // -----------------------------------------------------------------------
  // 4. Value 3 — 成长手册：XP 账本、能力卡、心得
  // -----------------------------------------------------------------------
  console.log('\n[成长手册价值]');
  try {
    await clickNav(page, '成长手册');
    await waitForStable(page, 3000);
    await page.evaluate(() => {
      const main = document.querySelector('main') || document.documentElement;
      main.scrollTop = 0;
    });
    await page.waitForTimeout(500);
    await capture(page, 'growth', '成长手册——XP+能力雷达+心得');
  } catch (e) { console.log(`  ✗ ${e.message.split('\n')[0]}`); }

  // -----------------------------------------------------------------------
  // 5. AI Trust — 战略陪伴：驾驶舱判断、置信度、确认状态
  // -----------------------------------------------------------------------
  console.log('\n[战略陪伴]');
  try {
    await clickNav(page, '战略陪伴');
    await waitForStable(page, 3000);
    await page.evaluate(() => {
      const main = document.querySelector('main') || document.documentElement;
      main.scrollTop = 0;
    });
    await page.waitForTimeout(500);
    await capture(page, 'strategic', '战略陪伴——经营判断+健康维度+证据');
  } catch (e) { console.log(`  ✗ ${e.message.split('\n')[0]}`); }

  // -----------------------------------------------------------------------
  // 6. Module tabs: 每个模块的主界面
  // -----------------------------------------------------------------------
  const tabs = [
    { nav: '客户工作台', name: 'client-workspace', desc: '客户工作台——项目问答+DNA+资料' },
    { nav: '资讯情报站', name: 'topics', desc: '资讯情报站——雷达+候选+洞察' },
    { nav: '测试工作台', name: 'workbench', desc: '测试工作台——诊断模板+分析' },
    { nav: '系统设置', name: 'settings', desc: '系统设置——组织+规则+品牌' },
  ];

  for (const tab of tabs) {
    console.log(`\n[${tab.nav}]`);
    try {
      await clickNav(page, tab.nav);
      await waitForStable(page, 2500);
      await page.evaluate(() => {
        const main = document.querySelector('main') || document.documentElement;
        main.scrollTop = 0;
      });
      await page.waitForTimeout(500);
      await capture(page, tab.name, tab.desc);
    } catch (e) { console.log(`  ✗ ${e.message.split('\n')[0]}`); }
  }

  // -----------------------------------------------------------------------
  // 7. Detail views: 日历、收件箱
  // -----------------------------------------------------------------------
  console.log('\n[子视图]');

  // Calendar
  try {
    await clickNav(page, '任务与日程');
    await waitForStable(page, 1500);
    await clickNav(page, '我的月历');
    await waitForStable(page, 2500);
    await capture(page, 'task-calendar', '内部月历——任务时间排布');
  } catch (e) { console.log(`  ✗ Calendar: ${e.message.split('\n')[0]}`); }

  // Inbox
  try {
    await clickNav(page, '协作收件箱');
    await waitForStable(page, 2500);
    await capture(page, 'collab-inbox', '协作收件箱——接收/退回');
  } catch (e) { console.log(`  ✗ Inbox: ${e.message.split('\n')[0]}`); }

  await browser.close();
  console.log(`\nDone! All screenshots in: ${OUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
