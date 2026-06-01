import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const SEL = '[data-yiyu-section-type="mobile-tabbar"]';
const results = [];
function check(name, pass, extra = '') {
  results.push({ name, pass, extra });
  console.log(`${pass ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
}

const browser = await chromium.launch();

// ---- 移动视口 (iPhone 12 ~ 390x844) ----
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await mob.newPage();

const tabPages = [
  { page: '', key: '首页' },
  { page: '?page=articles', key: '文章' },
  { page: '?page=reports', key: '报告' },
  { page: '?page=workbench', key: '益语AI' },
];

for (const { page, key } of tabPages) {
  await mp.goto(`${BASE}/${page}`, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(400);
  const bar = mp.locator(SEL);
  const visible = await bar.isVisible().catch(() => false);
  check(`移动端[${key}] 底栏出现`, visible);
  if (visible) {
    const labels = (await bar.locator('button span').allInnerTexts()).map((s) => s.trim());
    const want = ['首页', '文章', '报告', '益语AI'];
    check(`移动端[${key}] 4个标签正确`, want.every((w) => labels.includes(w)), labels.join('/'));
    // body 留白
    const pb = await mp.evaluate(() => getComputedStyle(document.body).paddingBottom);
    check(`移动端[${key}] body底部留白`, parseFloat(pb) >= 60, `padding-bottom=${pb}`);
  }
  await mp.screenshot({ path: `output/mobile-tabbar-${key}.png` }).catch(() => {});
}

// 点击切页: 在首页点「报告」应到 report-library
await mp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await mp.waitForTimeout(300);
await mp.locator(`${SEL} button`, { hasText: '报告' }).click();
await mp.waitForTimeout(500);
const url = mp.url();
check('移动端 点击「报告」切到报告页', /report|reports/.test(url), url);

// 详情页不应出现底栏 (报告阅读页 currentPage='report')
await mp.goto(`${BASE}/?page=report&id=set-index-2024`, { waitUntil: 'networkidle' });
await mp.waitForTimeout(400);
const onDetail = await mp.locator(SEL).isVisible().catch(() => false);
check('移动端 报告详情页 不出现底栏', !onDetail);

await mob.close();

// ---- 桌面视口 (1280) ----
const desk = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const dp = await desk.newPage();
await dp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await dp.waitForTimeout(400);
const deskVisible = await dp.locator(SEL).isVisible().catch(() => false);
check('桌面端 不出现底栏', !deskVisible);
const deskPb = await dp.evaluate(() => getComputedStyle(document.body).paddingBottom);
check('桌面端 body无额外留白', parseFloat(deskPb) < 30, `padding-bottom=${deskPb}`);
await desk.close();

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n结果: ${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
