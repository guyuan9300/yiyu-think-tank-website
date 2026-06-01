import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.SMARTISAN_WORKBENCH_URL || 'http://127.0.0.1:5173/lab/fundraising-test';
const OUTPUT_DIR = join(process.cwd(), 'output', 'smoke-smartisan-workbench');

mkdirSync(OUTPUT_DIR, { recursive: true });

const MOCK_FUNDING_LONG_FORM = `项目标题
星囊计划：80 元给一个孩子一份阅读礼物

项目摘要
为欠发达地区小规模乡村学校和公立幼儿园儿童筹集星囊阅读包，把适龄好书和阅读辅助材料真正送到孩子手里。

完整文案 / 项目说明
广州满天星公益计划面向欠发达地区的小规模乡村学校和公立幼儿园，筹集一批星囊阅读包。每个星囊包含适龄图书、阅读手册和反馈材料，并配合签收、派发、交换阅读和回访，确保孩子收到书，也真正读起来。

预算说明
首期筹款目标 40 万元，对应 5000 个星囊。保底目标 20 万元，冲刺目标 55 万元。

首屏钩子
74% 的乡村孩子，一年课外阅读不到 10 本。80 元，给一个孩子一份真正属于他的阅读礼物。

FAQ / 评论区解释
Q1：80 元到底支持了什么？
A：支持一个完整的星囊阅读包进入孩子手里，包括图书、阅读辅助材料和后续执行反馈。`;

const MOCK_DNA = `# 画像 DNA

## 角色定位
- 名称：共情见证型月捐人
- 角色：月捐人

## 关心什么
- 想看见真实儿童变化
- 想确认项目反馈是持续的

## 会被什么打动
- 具体数字
- 孩子的回音卡
- 清楚的阶段反馈

## 会担心什么
- 口号大于证据
- 预算模糊
- 看不到后续反馈`;

const MOCK_OPINION = {
  title: '关于星囊计划的公众说明',
  summary: '回应公众对可信度、预算透明度与执行反馈的关注。',
  fullText: '项目将公开阶段性进展、预算用途和执行反馈，避免只讲愿景、不讲证据，并明确机构与学校的执行流程。',
};

const MOCK_SYSTEMIC = {
  title: '县域儿童阅读支持机制方案',
  summary: '以问题链、机制链、执行链和反馈链构建县域阅读支持闭环。',
  problem: '当前资源投放碎片化，学校端阅读支持缺少稳定反馈与协同机制。',
  mechanism: '通过学校筛选、阅读包投放、教师陪伴、阶段反馈和复盘，形成可追踪的动作闭环。',
  budget: '首期预算 40 万元，用于阅读包、反馈机制、重点点位支持与阶段复盘。',
  notes: '重点看执行边界、学校筛选标准、反馈频次是否清楚。',
};

const report = {
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  steps: [],
};

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function recordStep(page, label, fn) {
  const started = Date.now();
  const entry = { label, status: 'passed', durationMs: 0, detail: '' };
  try {
    entry.detail = await fn();
  } catch (error) {
    entry.status = 'failed';
    entry.detail = error instanceof Error ? error.message : String(error);
    const file = join(OUTPUT_DIR, `${String(report.steps.length + 1).padStart(2, '0')}-${slugify(label)}.png`);
    await page.screenshot({ path: file, fullPage: true });
    entry.screenshot = file;
  } finally {
    entry.durationMs = Date.now() - started;
    report.steps.push(entry);
  }
}

async function closeModal(page) {
  const modalHeaderButton = page.locator('div.fixed.inset-0.z-\\[90\\] div.flex.items-center.justify-between button').first();
  if (await modalHeaderButton.count()) {
    await modalHeaderButton.click();
    await page.waitForTimeout(200);
  }
}

async function openProjectLibrary(page) {
  await page.getByRole('button', { name: '项目库' }).first().click();
}

async function fillEditorBlock(page, label, text) {
  await page.getByRole('button', { name: new RegExp(`^${label}$`) }).click();
  const area = page.locator('textarea').first();
  await area.waitFor({ timeout: 10000 });
  await area.fill(text);
}

async function waitForBanner(page, pattern, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const body = await page.locator('body').textContent();
    const match = body.match(pattern);
    if (match) return match[0];
    await page.waitForTimeout(500);
  }
  return '';
}

async function waitForAny(page, patterns, timeout = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const body = await page.locator('body').textContent();
    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) return match[0];
    }
    await page.waitForTimeout(1000);
  }
  return '';
}

async function clickKnowledgeActions(page) {
  const actions = ['我明白了', '加入我的手册', '记录本次已应用'];
  for (const label of actions) {
    const button = page.getByRole('button', { name: label });
    if (await button.count()) {
      await button.click();
      await page.waitForTimeout(300);
    }
  }
}

async function downloadViaAdvancedMenu(page) {
  await page.getByRole('button').filter({ has: page.locator('svg.lucide-more-horizontal') }).click();
  const downloadPromise = page.context().waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.getByRole('button', { name: /导出报告/ }).click();
  const download = await downloadPromise;
  if (!download) return '未触发下载';
  const suggested = download.suggestedFilename();
  const savePath = join(OUTPUT_DIR, suggested);
  await download.saveAs(savePath);
  return savePath;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1512, height: 982 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(String(error)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') runtimeErrors.push(`console:${msg.text()}`);
  });

  try {
    await recordStep(page, '打开工作台', async () => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.getByText('智能测试工作台').waitFor({ timeout: 15000 });
      return '页面已加载';
    });

    await recordStep(page, '三主题切换', async () => {
      await page.getByRole('button', { name: '舆情测试' }).click();
      await page.getByRole('button', { name: '系统性项目测试' }).click();
      await page.getByRole('button', { name: '筹款测试' }).click();
      return '舆情 / 系统性项目 / 筹款 三主题可切换';
    });

    await recordStep(page, '筹款项目库与新建画像', async () => {
      await page.getByRole('button', { name: '筹款测试' }).click();
      await openProjectLibrary(page);
      await page.getByRole('button', { name: '新建画像' }).click();
      const profileName = `自动化月捐画像-${Date.now()}`;
      await page.getByPlaceholder('例如：谨慎型平台月捐人').fill(profileName);
      await page.getByPlaceholder('你希望这个画像代表什么样的人？').fill('模拟测试：偏好真实反馈、具体数字和阶段性披露。');
      await page.getByRole('button', { name: '创建画像' }).click();
      const banner = await waitForBanner(page, /已创建画像：[^。\n]+/, 15000);
      if (!banner) throw new Error('创建画像后未看到成功提示');
      return banner;
    });

    await recordStep(page, '筹款 DNA 注入', async () => {
      await page.getByRole('button', { name: '添加 DNA' }).click();
      const dnaArea = page.getByPlaceholder('直接粘贴 DNA Markdown，或者先上传文件。');
      await dnaArea.fill(MOCK_DNA);
      await page.getByRole('button', { name: '解析 DNA' }).click();
      const parsed = await waitForBanner(page, /DNA 结构化解析成功。/, 10000);
      if (!parsed) throw new Error('DNA 解析未返回成功提示');
      await page.getByRole('button', { name: /注入当前画像|保存中/ }).click();
      const injected = await waitForBanner(page, /DNA 已注入当前画像。/, 15000);
      if (!injected) throw new Error('DNA 注入未返回成功提示');
      await closeModal(page);
      return 'DNA 模板解析并注入成功';
    });

    await recordStep(page, '筹款整篇方案解析', async () => {
      await openProjectLibrary(page);
      await page.getByPlaceholder('把整篇筹款范文直接贴进来。').fill(MOCK_FUNDING_LONG_FORM);
      await page.getByRole('button', { name: '解析到当前草稿' }).click();
      const banner = await waitForBanner(page, /已解析到当前筹款草稿。/, 10000);
      if (!banner) throw new Error('整篇方案未解析成功');
      await closeModal(page);
      await page.getByRole('button', { name: /^标题$/ }).click();
      const title = await page.locator('textarea').first().inputValue();
      if (!title.includes('星囊计划')) throw new Error('标题未被解析回主编辑区');
      return `标题已回填：${title}`;
    });

    await recordStep(page, '筹款分析启动', async () => {
      await page.getByRole('button', { name: '开始深度分析' }).click();
      const running = await waitForBanner(page, /分析中|月捐生命周期引擎|已完成千问增强分析|已回退到本地规则引擎|筹款分析失败/, 30000);
      if (!running) throw new Error('点击后没有进入分析态');
      return running;
    });

    await recordStep(page, '筹款学习动作与 Inspector', async () => {
      const suggestion = page.getByRole('button', { name: '查看匹配证据' }).first();
      if (!await suggestion.count()) return '当前未落出建议卡，跳过 Inspector 深测';
      await suggestion.click();
      await clickKnowledgeActions(page);
      return '已触发 Inspector 学习动作';
    });

    await recordStep(page, '筹款保存分析与导出', async () => {
      await page.getByRole('button').filter({ has: page.locator('svg.lucide-more-horizontal') }).click();
      const saveButton = page.getByRole('button', { name: /保存分析/ });
      if (!await saveButton.count()) return '当前没有可保存结果，跳过';
      await saveButton.click();
      const saveBanner = await waitForBanner(page, /已保存分析版本：/, 15000);
      const exportPath = await downloadViaAdvancedMenu(page);
      return `${saveBanner || '保存提示缺失'}；导出：${exportPath}`;
    });

    await recordStep(page, '舆情项目选择与分析启动', async () => {
      await page.getByRole('button', { name: '舆情测试' }).click();
      await openProjectLibrary(page);
      const currentUse = page.getByText('当前使用').first();
      if (!await currentUse.count()) {
        const firstProject = page.locator('text=/为爱黔行|.+/').first();
        if (await firstProject.count()) {
          await firstProject.click();
        }
      }
      await closeModal(page);
      await fillEditorBlock(page, '标题', MOCK_OPINION.title);
      await fillEditorBlock(page, '摘要', MOCK_OPINION.summary);
      await fillEditorBlock(page, '正文', MOCK_OPINION.fullText);
      await page.getByRole('button', { name: '开始深度分析' }).click();
      const status = await waitForAny(page, [/舆情评审运行中/, /舆情测试已完成/, /舆情分析失败/], 30000);
      if (!status) throw new Error('舆情主题点击后没有进入运行态');
      return status;
    });

    await recordStep(page, '舆情项目库载入能力', async () => {
      await openProjectLibrary(page);
      const runLoad = page.getByRole('button', { name: '载入' }).first();
      if (!await runLoad.count()) {
        await closeModal(page);
        return '当前还没有舆情 run，载入入口未触发';
      }
      await runLoad.click();
      const banner = await waitForBanner(page, /已载入舆情 Run：/, 10000);
      if (!banner) throw new Error('舆情 run 载入后未看到成功提示');
      return banner;
    });

    await recordStep(page, '系统性项目分析与历史', async () => {
      await page.getByRole('button', { name: '系统性项目测试' }).click();
      await openProjectLibrary(page);
      await page.getByPlaceholder('把外部批注、内部笔记、知识提示放在这里。').fill(MOCK_SYSTEMIC.notes);
      await closeModal(page);
      await fillEditorBlock(page, '标题', MOCK_SYSTEMIC.title);
      await fillEditorBlock(page, '摘要', MOCK_SYSTEMIC.summary);
      await fillEditorBlock(page, '问题定义', MOCK_SYSTEMIC.problem);
      await fillEditorBlock(page, '机制路径', MOCK_SYSTEMIC.mechanism);
      await fillEditorBlock(page, '执行预算', MOCK_SYSTEMIC.budget);
      await page.getByRole('button', { name: '开始深度分析' }).click();
      const status = await waitForAny(page, [/系统性项目分析中/, /系统性项目分析已完成/, /系统性项目分析失败/], 45000);
      if (!status) throw new Error('系统性项目主题点击后没有进入运行态');
      await openProjectLibrary(page);
      const loadButton = page.getByRole('button', { name: '载入' }).first();
      const historyState = await loadButton.count() ? '已有历史载入入口' : '历史分析尚未生成';
      await closeModal(page);
      return `${status}；${historyState}`;
    });

    await recordStep(page, '页内标签与底部入口', async () => {
      await page.getByRole('button', { name: '总览' }).click();
      await page.getByRole('button', { name: '模拟视图' }).click();
      await page.getByRole('button', { name: '依据与知识' }).click();
      await page.getByRole('button', { name: '改稿工作台' }).click();
      await page.getByRole('button', { name: '知识 / 历史入口' }).click();
      return '总览 / 改稿工作台 / 模拟视图 / 依据与知识 / 底部知识入口 均可切换';
    });

    report.runtimeErrors = runtimeErrors;
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUTPUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await browser.close();
  }
}

main().catch((error) => {
  report.finishedAt = new Date().toISOString();
  report.fatal = error instanceof Error ? error.message : String(error);
  writeFileSync(join(OUTPUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.error(error);
  process.exitCode = 1;
});
