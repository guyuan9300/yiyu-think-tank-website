import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'public/images/open-source');
const workbenchDir = path.join(rootDir, 'public/images/workbench');

function imageData(name) {
  const imagePath = path.join(workbenchDir, name);
  return `data:image/png;base64,${readFileSync(imagePath).toString('base64')}`;
}

const images = {
  tasks: imageData('tasks-overview.png'),
  taskList: imageData('task-list.png'),
  calendar: imageData('task-calendar.png'),
  client: imageData('client-workspace.png'),
  strategy: imageData('strategic.png'),
  weekly: imageData('weekly-review.png'),
  growth: imageData('growth.png'),
  topics: imageData('topics.png'),
  collab: imageData('collab-inbox.png'),
};

const baseCss = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 1600px;
    height: 1040px;
    font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
    color: #111827;
    background: #f5f8fb;
  }
  .asset {
    position: relative;
    width: 1600px;
    height: 1040px;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255,255,255,.94), rgba(246,250,252,.98)),
      radial-gradient(circle at 18% 14%, rgba(37,99,235,.12), transparent 28%),
      radial-gradient(circle at 84% 24%, rgba(20,184,166,.12), transparent 30%);
  }
  .asset::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(15,23,42,.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15,23,42,.055) 1px, transparent 1px);
    background-size: 52px 52px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,.75), transparent 92%);
  }
  .stage {
    position: absolute;
    inset: 56px;
    border: 1px solid rgba(51,65,85,.12);
    border-radius: 34px;
    background: rgba(255,255,255,.86);
    box-shadow: 0 30px 96px rgba(31,41,55,.14);
    overflow: hidden;
  }
  .topbar {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    border-bottom: 1px solid rgba(51,65,85,.10);
    background: rgba(248,250,252,.72);
  }
  .dots { display: flex; gap: 9px; }
  .dot { width: 12px; height: 12px; border-radius: 999px; }
  .red { background:#ff6b6b; } .yellow { background:#f6c85f; } .green-dot { background:#3ddc97; }
  .pill {
    border: 1px solid rgba(51,65,85,.14);
    border-radius: 999px;
    background: rgba(255,255,255,.82);
    padding: 8px 15px;
    color: #475569;
    font-size: 17px;
    font-weight: 800;
  }
  .content { position: relative; height: 980px; padding: 36px; }
  .eyebrow {
    color: #475569;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: .02em;
  }
  .title {
    margin: 0;
    color: #0f172a;
    font-size: 44px;
    line-height: 1.14;
    font-weight: 900;
    letter-spacing: 0;
  }
  .subtitle {
    margin: 12px 0 0;
    color: #64748b;
    font-size: 22px;
    line-height: 1.55;
    font-weight: 650;
  }
  .panel {
    border: 1px solid rgba(51,65,85,.13);
    border-radius: 24px;
    background: rgba(255,255,255,.92);
    box-shadow: 0 18px 48px rgba(31,41,55,.11);
  }
  .shot {
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid rgba(51,65,85,.13);
    background: #f8fafc;
  }
  .shot img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: saturate(1.02) contrast(1.02);
  }
  .label {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: #eef5ff;
    color: #2452d6;
    padding: 7px 12px;
    font-size: 15px;
    font-weight: 900;
  }
  .label.green { color:#08735f; background:#e7f8f1; }
  .label.orange { color:#9a4f12; background:#fff2dd; }
  .label.gray { color:#475569; background:#eef2f7; }
  .caption { color:#64748b; font-size:16px; line-height:1.45; font-weight:700; }
  .h2 { margin:0; font-size:28px; line-height:1.18; font-weight:900; color:#111827; }
  .arrow { color:#2f6fed; font-size:34px; font-weight:900; }
`;

function pageChrome(label, content) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><style>${baseCss}</style></head><body>
    <div class="asset"><div class="stage">
      <div class="topbar"><div class="dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green-dot"></span></div><div class="pill">${label}</div></div>
      <div class="content">${content}</div>
    </div></div>
  </body></html>`;
}

function shotCard({ image, title, caption, x, y, w = 315, h = 224, position = 'top' }) {
  return `
    <div class="panel" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;padding:10px;">
      <div class="shot" style="height:${h - 70}px;"><img src="${image}" style="object-position:${position};"/></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 6px 2px;">
        <strong style="font-size:21px;line-height:1.2;color:#0f172a;">${title}</strong>
        <span class="caption" style="text-align:right;">${caption}</span>
      </div>
    </div>
  `;
}

function miniShot({ image, title, caption, position = 'top' }) {
  return `
    <div class="panel" style="padding:12px;">
      <div class="shot" style="height:190px;"><img src="${image}" style="object-position:${position};"/></div>
      <h3 class="h2" style="margin-top:14px;">${title}</h3>
      <p class="caption" style="margin:8px 0 0;">${caption}</p>
    </div>
  `;
}

const hero = pageChrome('真实页面组成的组织智慧圆形图', `
  <div style="position:absolute;left:42px;top:40px;width:415px;">
    <div class="eyebrow">过程 · 经验 · 判断</div>
    <h1 class="title" style="margin-top:12px;">真实软件页面<br/>组成组织智慧大脑</h1>
    <p class="subtitle">外圈是已经存在的工作台局部，中心是组织记忆与行动判断。过程回流后，AI 才能持续提炼。</p>
  </div>
  <div style="position:absolute;left:380px;top:118px;width:760px;height:640px;border-radius:50%;border:1px solid rgba(37,99,235,.18);"></div>
  <div style="position:absolute;left:456px;top:186px;width:610px;height:505px;border-radius:50%;border:1px dashed rgba(37,99,235,.20);"></div>
  <div style="position:absolute;left:620px;top:330px;width:360px;height:250px;border-radius:38px;background:linear-gradient(145deg,#2556d8,#119e96);box-shadow:0 34px 110px rgba(37,99,235,.32);color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
    <div style="font-size:42px;font-weight:900;line-height:1.12;">组织智慧<br/>大脑</div>
    <p style="width:275px;margin:16px 0 0;color:rgba(255,255,255,.84);font-size:18px;line-height:1.5;font-weight:700;">过程留下来，AI 提炼成复盘、风险和下一步判断。</p>
  </div>
  ${shotCard({ image: images.tasks, title: '事件线', caption: '过程可追踪', x: 455, y: 78, w: 320, h: 210 })}
  ${shotCard({ image: images.calendar, title: '日历节奏', caption: '行动可承接', x: 835, y: 88, w: 310, h: 208 })}
  ${shotCard({ image: images.client, title: '客户/项目', caption: '背景可引用', x: 1130, y: 330, w: 320, h: 218 })}
  ${shotCard({ image: images.strategy, title: '周判断', caption: '判断有依据', x: 835, y: 650, w: 320, h: 215 })}
  ${shotCard({ image: images.weekly, title: '周复盘', caption: '经验可沉淀', x: 455, y: 655, w: 320, h: 215 })}
  ${shotCard({ image: images.growth, title: '成长手册', caption: '方法可复用', x: 110, y: 348, w: 320, h: 215 })}
  <div class="panel" style="position:absolute;right:66px;top:710px;width:360px;padding:18px;">
    <span class="label orange">共建议题池</span>
    <h3 class="h2" style="margin-top:10px;font-size:24px;">真实场景长出公共工具</h3>
    <p class="caption" style="margin:8px 0 0;">现有工作台覆盖不到的场景，进入议题、任务和验收流程。</p>
  </div>
`);

const aiCost = pageChrome('AI 降低管理成本', `
  <h1 class="title">AI 先读过程，再整理行动、风险和复盘</h1>
  <p class="subtitle">它不是独立聊天框，而是从会议、任务、日历和素材里提炼可行动结果。</p>
  <div style="margin-top:38px;display:grid;grid-template-columns:1fr 60px 1fr 60px 1fr;gap:18px;align-items:center;">
    ${miniShot({ image: images.collab, title: '会议与协作痕迹', caption: '纪要、讨论、待办先进入上下文。' })}
    <div class="arrow">→</div>
    ${miniShot({ image: images.taskList, title: '行动项进入任务', caption: '负责人、截止时间和附件继续推进。' })}
    <div class="arrow">→</div>
    ${miniShot({ image: images.weekly, title: '生成复盘和报告草稿', caption: '周复盘、风险提醒和下一步建议可直接使用。' })}
  </div>
  <div class="panel" style="margin-top:24px;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;">
    <span class="label">整理</span><span class="caption">会议纪要变成行动项</span>
    <span class="label green">提醒</span><span class="caption">日历与任务提示风险</span>
    <span class="label orange">复盘</span><span class="caption">素材自动进入周判断</span>
  </div>
`);

const experience = pageChrome('个人经验变组织经验', `
  <h1 class="title">事件线记录过程，模板沉淀方法，日历承接下一次行动</h1>
  <p class="subtitle">好经验不是写在某个人脑子里，而是在真实工作台里被记录、复盘和复用。</p>
  <div style="margin-top:36px;display:grid;grid-template-columns:1fr 60px 1fr 60px 1fr;gap:18px;align-items:center;">
    ${miniShot({ image: images.tasks, title: '事件线', caption: '一件事如何推进、谁参与、卡在哪里。' })}
    <div class="arrow">→</div>
    ${miniShot({ image: images.growth, title: '流程模板 / 成长手册', caption: '复盘出可复用的方法和判断依据。' })}
    <div class="arrow">→</div>
    ${miniShot({ image: images.calendar, title: '日历节奏', caption: '下次行动不从零开始，直接承接模板。' })}
  </div>
`);

const socialTrace = pageChrome('公益痕迹与素材自然沉淀', `
  <h1 class="title">平时自然沉淀，汇报不用从零整理</h1>
  <p class="subtitle">活动、签到、照片、服务记录、会议结论和月报素材在行动中进入同一条证据链。</p>
  <div style="margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
    <div class="panel" style="padding:22px;">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
        ${miniShot({ image: images.topics, title: '活动与议题', caption: '活动过程可追踪。' })}
        ${miniShot({ image: images.taskList, title: '服务记录', caption: '签到和服务时长进入任务证据。' })}
      </div>
    </div>
    <div class="panel" style="padding:26px;">
      <span class="label green">月报草稿</span>
      <h2 class="h2" style="margin-top:18px;">从过程材料生成可复盘、可汇报、可传播的素材包</h2>
      <div style="margin-top:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        ${[['服务人次','1,284'],['志愿时长','628h'],['物资发放','3,420件']].map(([k,v]) => `<div class="panel" style="padding:18px;box-shadow:none;"><div style="font-size:34px;font-weight:900;color:#0f766e;">${v}</div><div class="caption">${k}</div></div>`).join('')}
      </div>
      <div style="margin-top:22px;display:grid;gap:12px;">
        ${['照片素材已归档', '服务反馈已摘要', '资助方汇报可引用', '责任留痕可追溯'].map((item) => `<div style="padding:15px 16px;border-radius:15px;background:#f8fafc;border:1px solid rgba(51,65,85,.10);font-size:20px;font-weight:850;">${item}</div>`).join('')}
      </div>
    </div>
  </div>
`);

const coIssue = pageChrome('共建议题池协作看板', `
  <h1 class="title">一个真实组织场景，如何变成公共工具</h1>
  <p class="subtitle">议题卡要让人看到：谁被消耗、希望解放什么、缺谁参与、下一步是什么。</p>
  <div style="margin-top:34px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
    ${[
      ['新组织场景','志愿者服务时长难统计','消耗项目负责人月底统计','缺产品志愿者'],
      ['等待认领','物资发放去向记录','消耗仓库与项目人员核对','缺前端 / 后端'],
      ['正在长成功能','合同节点提醒','减少续约和回款遗漏','缺测试志愿者'],
      ['真实组织验证','活动报名与签到','减少活动后补表格','缺文档志愿者'],
    ].map(([state,title,cost,missing], index) => `<div class="panel" style="min-height:470px;padding:18px;background:${index === 1 ? '#fffdf7' : index === 2 ? '#f8fbff' : '#ffffff'};">
      <span class="label ${index === 0 ? 'gray' : index === 1 ? 'orange' : index === 2 ? '' : 'green'}">${state}</span>
      <h2 class="h2" style="margin-top:18px;">${title}</h2>
      <p class="caption" style="margin-top:14px;">${cost}</p>
      <div style="margin-top:22px;padding-top:18px;border-top:1px solid rgba(51,65,85,.12);">
        <div class="caption">现在缺谁</div>
        <div style="margin-top:8px;font-size:21px;font-weight:900;">${missing}</div>
      </div>
      <div style="margin-top:22px;display:flex;gap:8px;flex-wrap:wrap;"><span class="label">场景</span><span class="label green">任务</span><span class="label orange">验收</span></div>
    </div>`).join('')}
  </div>
`);

function showroom({ label, title, subtitle, image, badges }) {
  return pageChrome(label, `
    <div style="display:grid;grid-template-columns:.88fr 1.12fr;gap:28px;height:820px;align-items:center;">
      <div>
        <div class="eyebrow">${label}</div>
        <h1 class="title" style="margin-top:12px;">${title}</h1>
        <p class="subtitle">${subtitle}</p>
        <div style="margin-top:28px;display:grid;gap:12px;">
          ${badges.map(([a,b], i) => `<div class="panel" style="padding:18px 20px;box-shadow:none;"><span class="label ${i % 3 === 1 ? 'green' : i % 3 === 2 ? 'orange' : ''}">${a}</span><p class="caption" style="margin:10px 0 0;">${b}</p></div>`).join('')}
        </div>
      </div>
      <div class="panel" style="padding:14px;">
        <div class="shot" style="height:585px;"><img src="${image}" style="object-position:top;"/></div>
      </div>
    </div>
  `);
}

const showroomClient = showroom({
  label: '客户/项目工作台',
  title: '项目背景、关系状态和下一步动作在同一屏',
  subtitle: '它不是客户字段表，而是项目背景源，供任务、复盘和 AI 判断读取。',
  image: images.client,
  badges: [
    ['资料可引用', '客户、联系人、会议、合同、附件和反馈一起沉淀。'],
    ['判断有依据', '关系温度、风险提醒和待跟进行动不再靠记忆。'],
    ['可扩展', '可变成捐赠人、资助方、合作伙伴工作台。'],
  ],
});

const showroomStrategy = showroom({
  label: '周判断 / 战略陪伴',
  title: '管理判断来自过程，不来自空泛总结',
  subtitle: '按事件线读取项目、任务、会议和复盘，给负责人看风险、机会和建议动作。',
  image: images.strategy,
  badges: [
    ['过程可追踪', '先看关键事件线，再看风险和机会。'],
    ['减少空话', '判断口径来自项目背景、阶段和近期行动。'],
    ['直接给动作', '建议落到任务、会议、复核或下一步沟通。'],
  ],
});

const showroomExperience = showroom({
  label: '事件线 + 日历 + 模板',
  title: '做过一次的好方法，下次可以直接复用',
  subtitle: '事件线留下过程，流程模板沉淀方法，日历把经验放进真实行动节奏。',
  image: images.tasks,
  badges: [
    ['过程可追踪', '谁参与、推进到哪、卡在哪里都能回看。'],
    ['经验可复用', '复盘后形成流程模板和行动节奏。'],
    ['新人可接手', '交接不再只靠口头说明。'],
  ],
});

const showroomCoIssue = showroom({
  label: '共建议题池',
  title: '真实场景被整理成可认领的公共工具任务',
  subtitle: '组织提交场景，社区拆成产品、设计、开发、测试、文档和实施任务。',
  image: images.topics,
  badges: [
    ['问题可见', '真实问题、消耗对象、下一步动作写清楚。'],
    ['角色可参与', '志愿者能按能力和投入时间筛选任务。'],
    ['成果可复用', '通过验证后回到开源系统。'],
  ],
});

const volunteer = pageChrome('志愿者协作', `
  <h1 class="title">从一个边界清楚的小任务开始参与</h1>
  <p class="subtitle">产品、开发、设计、测试、文档和实施都可以从真实议题里找到入口。</p>
  <div style="margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
    ${miniShot({ image: images.topics, title: '筛选共建议题', caption: '按角色、难度、投入时间找到任务。' })}
    ${miniShot({ image: images.collab, title: '协作与反馈', caption: '讨论、认领、验收和反馈都可追踪。' })}
  </div>
`);

async function render(page, filename, html) {
  await page.setViewportSize({ width: 1600, height: 1040 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, filename), type: 'png' });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  await render(page, 'hero-circular-prototype.png', hero);
  await render(page, 'hero-brain-loop.png', hero);
  await render(page, 'ai-cost-flow.png', aiCost);
  await render(page, 'experience-system.png', experience);
  await render(page, 'social-trace-system.png', socialTrace);
  await render(page, 'co-issue-workflow.png', coIssue);
  await render(page, 'showroom-client.png', showroomClient);
  await render(page, 'showroom-strategy.png', showroomStrategy);
  await render(page, 'showroom-experience.png', showroomExperience);
  await render(page, 'showroom-coissue.png', showroomCoIssue);
  await render(page, 'volunteer-collab.png', volunteer);

  await browser.close();
  console.log(`Generated open-source visuals in ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
