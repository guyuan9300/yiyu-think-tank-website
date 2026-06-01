// 场景1: 任务月历 — 复刻 V2.0 软件"任务与日程 / 我的月历"页。
//
// 性质说明：
//   - 月历网格的日期数学：1:1 复用 ./ported/calendarUtils.ts（搬自 shared/calendar.ts，纯函数）
//   - 任务卡颜色逻辑：⭐ 1:1 复刻 src/renderer/components/tasks/TaskCalendarView.tsx
//     第 218–241 行 `calendarTaskAccentColor` + `calendarChipStyle`：
//       · text = accent
//       · bg   = `${accent}14`（~8% 透明度）
//       · border = `${accent}22`（~13% 透明度）
//       · 飞机/高铁/航班关键词 → 翠绿（出差）
//       · done → 灰底灰字
//       · 未关联客户 → 默认蓝 #5B7BFE
//   - 客户调色板：1:1 复制 App.tsx 第 980 行 colorPalette。每个客户从这里取色。
//   - 任务卡视觉外壳、tab、行动按钮：按截图重画（软件原件 1648 行，无法直接 import）
//   - 样例任务数据：60+ 条，覆盖整月，按真实业务场景分配客户色
//
// 动效（"软塑料胶纸甩过去"）：
//   - 网格双图层结构：
//       Layer 1：空格 + 周表头 + 日期数字 + 今日红圈 = t=0 即可见的静态背景
//       Layer 2：任务卡这一整层，套对角 `mask-image: linear-gradient(135deg, …)` 波浪覆盖
//       Layer 3：浪峰处一道淡白光带，`mix-blend-mode: overlay` 跟随波浪推进
//   - 波浪 2.5s + 0.3s 起步延迟，cubic-bezier(0.16, 1, 0.3, 1) 缓出
//   - 每个任务卡按 `(rowIdx + colIdx)` 错位 0.15s 的 scale 余震（0.93 → 1.03 → 1）
//     —— 浪头啪一下贴上后，每个卡片再轻微抖一下"落位"
//   - 全部遵守 prefers-reduced-motion

import { useEffect, useState } from 'react';
import { Plus, Sparkles, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCalendarCells, formatMonthTitle } from '../ported/calendarUtils';
import { AppShell } from './AppShell';
import { useLang, type Bilingual } from '../../../../lib/i18n';

// ── 从 V2.0 软件 App.tsx 第 980 行原样搬运的客户调色板 ──
// const colorPalette = ['#888681', '#5B7BFE', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#06B6D4'];
const CLIENT_COLOR_BY_ID: Record<string, string> = {
  rici: '#5B7BFE',       // 日慈基金会 — 默认蓝
  shanjia: '#10B981',    // 善加基金会 — 翠绿
  weiaiqian: '#F59E0B',  // 为爱黔行 — 琥珀
  beishi: '#8B5CF6',     // 贝石基金会 — 紫
  huifeng: '#F43F5E',    // 汇丰 — 玫红
  yiyu: '#06B6D4',       // 益语智库（内部）— 青
  org: '#888681',        // 组织级任务 — 组织灰
};

const DEFAULT_UNLINKED_TASK_COLOR = '#5B7BFE';
const TRANSPORT_COLOR = '#16A34A';

interface CalendarTask {
  day: number;
  title: Bilingual;
  time?: string;
  clientId?: keyof typeof CLIENT_COLOR_BY_ID;
  done?: boolean;
}

// 满月（5 月 2026）任务样例 —— 每条标客户，方便按颜色区分
const SAMPLE_TASKS: CalendarTask[] = [
  // 1-3 日（周五 / 周六 / 周日 · 五一假期）
  { day: 1, title: { zh: '劳动节假期 / 备料', en: 'May Day holiday / prep' }, clientId: 'org' },
  { day: 1, title: { zh: '日慈手册改版收尾', en: 'Rici handbook revision wrap-up' }, clientId: 'rici', done: true },
  { day: 2, title: { zh: '休息日 / 写作', en: 'Rest day / writing' }, clientId: 'org' },
  { day: 3, title: { zh: '善加 Q2 计划阅读', en: 'Shanjia Q2 plan review' }, clientId: 'shanjia' },

  // 4-10 日（第一个完整工作周）
  { day: 4, title: { zh: '季度规划复盘', en: 'Quarterly planning review' }, clientId: 'org' },
  { day: 4, title: { zh: '日慈基金会战略对齐', en: 'Rici Foundation strategy alignment' }, time: '10:00', clientId: 'rici' },
  { day: 4, title: { zh: '同事一对一沟通', en: 'Team 1:1 check-ins' }, clientId: 'org' },
  { day: 5, title: { zh: '为爱黔行家访准备', en: 'Weiaiqian home-visit prep' }, clientId: 'weiaiqian' },
  { day: 5, title: { zh: '善加基金会方案 V3', en: 'Shanjia Foundation proposal V3' }, clientId: 'shanjia' },
  { day: 5, title: { zh: '贝石基金会启动', en: 'Beishi Foundation kickoff' }, time: '14:00', clientId: 'beishi' },
  { day: 6, title: { zh: '汇丰技术对接', en: 'HSBC technical sync' }, clientId: 'huifeng' },
  { day: 6, title: { zh: '日慈品牌素材汇总', en: 'Rici brand assets roundup' }, clientId: 'rici' },
  { day: 6, title: { zh: '内部周会', en: 'Internal weekly meeting' }, time: '16:00', clientId: 'org' },
  { day: 7, title: { zh: '飞往云南 · 出差', en: 'Fly to Yunnan · business trip' }, clientId: 'weiaiqian' }, // 飞 → 翠绿强制覆盖
  { day: 7, title: { zh: '为爱黔行落地准备', en: 'Weiaiqian rollout prep' }, clientId: 'weiaiqian' },
  { day: 8, title: { zh: '善加项目评估表', en: 'Shanjia project assessment sheet' }, clientId: 'shanjia' },
  { day: 8, title: { zh: '汇丰季度复盘', en: 'HSBC quarterly review' }, time: '15:00', clientId: 'huifeng' },
  { day: 8, title: { zh: '+ 2 条更多', en: '+ 2 more' }, clientId: 'org' }, // marker
  { day: 9, title: { zh: '周五例会', en: 'Friday standup' }, time: '09:30', clientId: 'org' },
  { day: 9, title: { zh: '日慈下周计划', en: 'Rici next-week plan' }, clientId: 'rici' },
  { day: 9, title: { zh: '内部周报整理', en: 'Internal weekly report' }, clientId: 'yiyu' },
  { day: 10, title: { zh: '资料归档 / 周末', en: 'File archiving / weekend' }, clientId: 'org' },

  // 11-17 日
  { day: 11, title: { zh: '录音软件功能及 OCR', en: 'Audio capture & OCR feature' }, clientId: 'yiyu' },
  { day: 11, title: { zh: '功能数据复盘与逐项验收', en: 'Feature data review & sign-off' }, clientId: 'yiyu' },
  { day: 12, title: { zh: '贝石手册内容撰写', en: 'Beishi handbook writing' }, clientId: 'beishi' },
  { day: 12, title: { zh: '加入组织计划模块', en: 'Add org planning module' }, clientId: 'yiyu' },
  { day: 13, title: { zh: '检验多端同步', en: 'Verify multi-device sync' }, clientId: 'yiyu' },
  { day: 13, title: { zh: '签约并确认改造方案', en: 'Sign off rebuild proposal' }, clientId: 'huifeng' },
  { day: 14, title: { zh: '日慈文件更新', en: 'Rici document update' }, clientId: 'rici' },
  { day: 14, title: { zh: '候选批量复制文件', en: 'Batch-copy candidate files' }, clientId: 'rici' },
  { day: 14, title: { zh: '新建任务测试周复盘', en: 'New-task test weekly review' }, clientId: 'yiyu' },
  { day: 14, title: { zh: '新建任务测试周复盘', en: 'New-task test weekly review' }, clientId: 'yiyu' },
  { day: 14, title: { zh: '+ 8 条更多', en: '+ 8 more' }, clientId: 'org' },
  { day: 15, title: { zh: '为爱黔行资料更新', en: 'Weiaiqian materials update' }, clientId: 'weiaiqian' },
  { day: 15, title: { zh: '打印云南手册及最新版', en: 'Print latest Yunnan handbook' }, clientId: 'weiaiqian' },
  { day: 15, title: { zh: '给兰书记寄出云南报告', en: 'Mail Yunnan report to Sec. Lan' }, clientId: 'weiaiqian' },
  { day: 16, title: { zh: '周复盘改极简 UI 设计', en: 'Weekly review minimal UI redesign' }, clientId: 'yiyu' },
  { day: 16, title: { zh: '把资讯情报站同步', en: 'Sync the intelligence hub' }, clientId: 'yiyu' },
  { day: 17, title: { zh: '大模型自修复系统', en: 'LLM self-healing system' }, clientId: 'yiyu' },

  // 18-24 日
  { day: 18, title: { zh: '专家核对与专业修订', en: 'Expert review & revision' }, clientId: 'rici' },
  { day: 18, title: { zh: '高老师（善加）一对一', en: '1:1 with Ms. Gao (Shanjia)' }, clientId: 'shanjia' },
  { day: 19, title: { zh: '善加基金会评估报告', en: 'Shanjia Foundation assessment report' }, clientId: 'shanjia' },
  { day: 19, title: { zh: '更新为爱黔行', en: 'Update Weiaiqian' }, time: '09:00', clientId: 'weiaiqian' },
  { day: 19, title: { zh: '日慈做方案', en: 'Draft Rici proposal' }, time: '11:00', clientId: 'rici' },
  { day: 20, title: { zh: '测试任务', en: 'Test task' }, clientId: 'yiyu' },
  { day: 20, title: { zh: '项目流程与岗位说明', en: 'Project workflow & role specs' }, clientId: 'org' },
  { day: 20, title: { zh: '跟进善加汇丰合作', en: 'Follow up Shanjia–HSBC partnership' }, clientId: 'shanjia' },
  { day: 20, title: { zh: '汇丰与善加项目关联', en: 'Link HSBC & Shanjia projects' }, clientId: 'huifeng' },
  { day: 20, title: { zh: '+ 4 条更多', en: '+ 4 more' }, clientId: 'org' },
  { day: 21, title: { zh: '家长测试与一线可用', en: 'Parent testing & field readiness' }, clientId: 'rici' },
  { day: 21, title: { zh: '贝石基金会电话会', en: 'Beishi Foundation call' }, clientId: 'beishi' },
  { day: 21, title: { zh: '本地模型设备检测', en: 'Local model device check' }, clientId: 'yiyu' },
  { day: 22, title: { zh: '完成战略梳理 AI 工具', en: 'Finish strategy-mapping AI tool' }, clientId: 'yiyu' },
  { day: 22, title: { zh: '手机版功能和界面', en: 'Mobile features & UI' }, clientId: 'yiyu' },
  { day: 22, title: { zh: '给 yani 寄出云南报告', en: 'Mail Yunnan report to Yani' }, clientId: 'weiaiqian' },
  { day: 22, title: { zh: '给 yani 寄出云南报告', en: 'Mail Yunnan report to Yani' }, clientId: 'weiaiqian' },
  { day: 22, title: { zh: '+ 1 条更多', en: '+ 1 more' }, clientId: 'org' },
  { day: 23, title: { zh: '和日慈张真进行 5 月复盘', en: 'May review with Zhang Zhen (Rici)' }, clientId: 'rici' },
  { day: 23, title: { zh: '给客户工作台加入', en: 'Add to client workspace' }, clientId: 'yiyu' },
  { day: 23, title: { zh: '与周玉亮共进午餐', en: 'Lunch with Zhou Yuliang' }, clientId: 'org' },
  { day: 24, title: { zh: '绩效方案设计', en: 'Performance scheme design' }, clientId: 'org' },
  { day: 24, title: { zh: '签约并确认改造方案', en: 'Sign off rebuild proposal' }, clientId: 'huifeng' },

  // 25-31 日
  { day: 25, title: { zh: '手册设计排版与图', en: 'Handbook layout & graphics' }, clientId: 'rici' },
  { day: 25, title: { zh: '完成存量品牌素材', en: 'Finish existing brand assets' }, clientId: 'rici' },
  { day: 25, title: { zh: '（无标题）', en: '(untitled)' }, time: '02:30', clientId: 'yiyu' },
  { day: 25, title: { zh: '~5000 字稿件审校', en: '~5,000-word manuscript review' }, time: '03:02', clientId: 'rici' },
  { day: 25, title: { zh: '+ 22 条更多', en: '+ 22 more' }, clientId: 'org' },
  { day: 26, title: { zh: '日慈基金会品牌内', en: 'Rici Foundation branding' }, clientId: 'rici' },
  { day: 26, title: { zh: '撰写日慈基金会内', en: 'Write Rici Foundation copy' }, clientId: 'rici' },
  { day: 26, title: { zh: '今天要把为爱黔', en: 'Land Weiaiqian today' }, time: '12:00', clientId: 'weiaiqian' },
  { day: 26, title: { zh: '调整益语智库官', en: 'Tune Yiyu Institute site' }, time: '14:00', clientId: 'yiyu' },
  { day: 26, title: { zh: '+ 1 条更多', en: '+ 1 more' }, clientId: 'org' },
  { day: 27, title: { zh: '飞书文档同步', en: 'Feishu doc sync' }, time: '10:00', clientId: 'yiyu' },
  { day: 27, title: { zh: '会见善加基金会', en: 'Meet Shanjia Foundation' }, time: '15:00', clientId: 'shanjia' },
  { day: 27, title: { zh: '今天要把为爱黔', en: 'Land Weiaiqian today' }, time: '12:00', clientId: 'weiaiqian' },
  { day: 27, title: { zh: '新增任务不应', en: 'New-task edge case' }, time: '21:00', clientId: 'yiyu' },
  { day: 28, title: { zh: '大模型和云空间的对接', en: 'LLM & cloud storage integration' }, clientId: 'yiyu' },
  { day: 28, title: { zh: '加入智能机器人系统', en: 'Add chatbot system' }, clientId: 'yiyu' },
  { day: 28, title: { zh: '手册配套视频与音频', en: 'Handbook video & audio' }, clientId: 'rici' },
  { day: 28, title: { zh: '+ 1 条更多', en: '+ 1 more' }, clientId: 'org' },
  { day: 29, title: { zh: '完善为爱黔行战略', en: 'Refine Weiaiqian strategy' }, clientId: 'weiaiqian' },
  { day: 29, title: { zh: '跟进文总设计', en: 'Follow up with Director Wen on design' }, time: '10:00', clientId: 'rici' },
  { day: 29, title: { zh: '汇丰技术小组', en: 'HSBC tech working group' }, time: '12:00', clientId: 'huifeng' },
  { day: 29, title: { zh: '+ 1 条更多', en: '+ 1 more' }, clientId: 'org' },
  { day: 30, title: { zh: '一场盛大的阳谋', en: 'A grand open gambit' }, clientId: 'org' },
];

const MY_CALENDAR_TAB: Bilingual = { zh: '我的月历', en: 'My Calendar' };
const TOP_TABS: Bilingual[] = [
  { zh: '协作收件箱', en: 'Shared Inbox' },
  { zh: '任务列表', en: 'Task List' },
  MY_CALENDAR_TAB,
  { zh: '组织计划', en: 'Org Plans' },
  { zh: '事件线', en: 'Timeline' },
  { zh: '周复盘', en: 'Weekly Review' },
];
const WEEKDAY_HEADERS: Bilingual[] = [
  { zh: '一', en: 'Mon' },
  { zh: '二', en: 'Tue' },
  { zh: '三', en: 'Wed' },
  { zh: '四', en: 'Thu' },
  { zh: '五', en: 'Fri' },
  { zh: '六', en: 'Sat' },
  { zh: '日', en: 'Sun' },
];

// ── 任务卡颜色逻辑：1:1 复刻软件 TaskCalendarView 第 218–241 行 ──
function isTransportTask(title: string): boolean {
  return /(飞[一-鿿]{1,8}|飞去[一-鿿]{1,8}|飞往[一-鿿]{1,8}|航班|机票|高铁|动车|火车去[一-鿿]{1,8})/.test(title);
}

function calendarTaskAccentColor(task: CalendarTask): string {
  if (isTransportTask(task.title.zh)) return TRANSPORT_COLOR;
  if (!task.clientId) return DEFAULT_UNLINKED_TASK_COLOR;
  return CLIENT_COLOR_BY_ID[task.clientId] ?? DEFAULT_UNLINKED_TASK_COLOR;
}

interface ChipStyle {
  color: string;
  background: string;
  border: string;
}

function calendarChipStyle(task: CalendarTask): ChipStyle {
  if (task.done) {
    return { color: '#94A3B8', background: '#F8FAFC', border: '#E2E8F0' };
  }
  const accent = calendarTaskAccentColor(task);
  return {
    color: accent,
    background: `${accent}14`,
    border: `${accent}22`,
  };
}

function isOverflowMarker(title: string): boolean {
  return /^\+\s*\d+\s*条更多$/.test(title);
}

function TaskPill({ task }: { task: CalendarTask }): JSX.Element {
  const { t } = useLang();
  if (isOverflowMarker(task.title.zh)) {
    return (
      <div
        style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, paddingLeft: 4, marginTop: 2 }}
      >
        {t(task.title)}
      </div>
    );
  }

  const style = calendarChipStyle(task);
  return (
    <div
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5"
      style={{
        background: style.background,
        border: `1px solid ${style.border}`,
        fontSize: 11,
        lineHeight: '14px',
        fontWeight: 500,
        color: style.color,
      }}
    >
      <span
        className="flex items-center justify-center rounded-[3px] shrink-0"
        style={{
          width: 12,
          height: 12,
          background: task.done ? '#E2E8F0' : 'transparent',
          border: `1.2px solid ${task.done ? '#CBD5E1' : style.color}`,
          opacity: task.done ? 1 : 0.7,
        }}
      >
        {task.done && <Check size={9} color="#94A3B8" strokeWidth={3} />}
      </span>
      <span className="truncate" style={{ flex: 1, minWidth: 0 }}>
        {task.time && <span style={{ fontWeight: 600, marginRight: 4 }}>{task.time}</span>}
        {t(task.title)}
      </span>
    </div>
  );
}

// ── 波浪动效相关 keyframes（一次性注入） ──
// 重要：全部走 GPU 合成线程（transform / opacity），不碰 mask-image / mix-blend-mode 等 CPU 慢路径。
//
// 对角波浪覆盖的"层"感是用每个任务格子的 (row+col) 错位 delay 实现的——
// 视觉上仍然是从左上角推到右下角的连续波浪，但每个格子用的都是 GPU 加速的
// transform + opacity，浏览器只在合成线程跑动画，主线程不卡。
//
// 浪峰白光：一个 200% 大小的子元素带 135deg gradient 高光带，
// transform: translate3d 从左上偏移到右下偏移 = 一道斜光滑过整个网格。
// translate3d 强制 GPU 合成，不触发 layout/paint。
const CAL_SCENE_CSS = `
@keyframes calTaskReveal {
  0%   { opacity: 0; transform: translate3d(0, 6px, 0) scale(0.94); }
  55%  { opacity: 1; transform: translate3d(0, 0, 0) scale(1.028); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes calHighlightSweep {
  0%   { transform: translate3d(-100%, -100%, 0); }
  100% { transform: translate3d(100%, 100%, 0); }
}
`;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = (): void => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

function CalendarMain(): JSX.Element {
  const { t } = useLang();
  // 演示用：固定 2026 年 5 月，今日 = 26（与截图1一致）
  const baseDate = new Date(2026, 4, 1);
  const today = 26;
  const cells = buildCalendarCells(baseDate);
  const monthTitle = formatMonthTitle(baseDate);
  const reduced = useReducedMotion();

  const tasksByDay = new Map<number, CalendarTask[]>();
  for (const t of SAMPLE_TASKS) {
    const list = tasksByDay.get(t.day) || [];
    list.push(t);
    tasksByDay.set(t.day, list);
  }

  return (
    <div className="h-full flex flex-col" style={{ padding: '24px 28px' }}>
      <style>{CAL_SCENE_CSS}</style>

      {/* 顶部：页面标题 + tab + 行动按钮 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold tracking-tight text-[#0F172A]" style={{ fontSize: 26 }}>
          {t({ zh: '任务与日程', en: 'Tasks & Schedule' })}
        </h1>
        <div className="flex items-center rounded-full" style={{ background: '#F1F5F9', padding: 4, fontSize: 13 }}>
          {TOP_TABS.map((tab) => {
            const active = tab === MY_CALENDAR_TAB;
            return (
              <div
                key={tab.zh}
                className={`rounded-full px-4 py-1.5 font-medium ${active ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B]'}`}
              >
                {t(tab)}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-white" style={{ background: '#3A4FB5', fontSize: 13 }}>
            <Plus size={15} />
            <span className="font-medium">{t({ zh: '新建任务', en: 'New Task' })}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-white" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', fontSize: 13 }}>
            <Sparkles size={15} />
            <span className="font-medium">AI</span>
          </div>
        </div>
      </div>

      {/* 月历卡片 */}
      <div className="flex-1 rounded-[20px] bg-white border border-[#E5E7EB] overflow-hidden flex flex-col">
        {/* 卡内顶部 */}
        <div className="flex items-center justify-between border-b border-[#F1F5F9]" style={{ padding: '14px 20px' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1" style={{ fontSize: 12 }}>
              <div className="rounded-lg px-3 py-1 bg-white text-[#5B7BFE] font-bold shadow-sm">{t({ zh: '月', en: 'Month' })}</div>
              <div className="px-3 py-1 text-[#94A3B8] font-bold">{t({ zh: '周', en: 'Week' })}</div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 text-[11px]">{t({ zh: '本月任务 124 条', en: '124 tasks this month' })}</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-600 text-[11px]">{t({ zh: '完成 41', en: 'Done 41' })}</span>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-700 text-[11px]">{t({ zh: '待推进 73', en: 'In progress 73' })}</span>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-rose-600 text-[11px]">{t({ zh: '逾期 10', en: 'Overdue 10' })}</span>
          </div>
          <div className="flex items-center gap-2 text-[#475569]" style={{ fontSize: 13 }}>
            <div className="rounded-xl border border-[#E2E8F0] w-9 h-9 flex items-center justify-center"><ChevronLeft size={16} /></div>
            <div className="rounded-xl border border-[#E2E8F0] px-3 h-9 flex items-center font-bold">{monthTitle}</div>
            <div className="rounded-xl border border-[#E2E8F0] w-9 h-9 flex items-center justify-center font-bold">{t({ zh: '今', en: 'Today' })}</div>
            <div className="rounded-xl border border-[#E2E8F0] w-9 h-9 flex items-center justify-center"><ChevronRight size={16} /></div>
          </div>
        </div>

        {/* 星期表头 */}
        <div className="grid grid-cols-7 border-b border-[#F1F5F9]">
          {WEEKDAY_HEADERS.map((w) => (
            <div key={w.zh} className="text-center text-[#94A3B8] font-medium" style={{ fontSize: 12, padding: '10px 0' }}>
              {t({ zh: `周${w.zh}`, en: w.en })}
            </div>
          ))}
        </div>

        {/* 6×7 网格 —— 全 GPU 合成线程动效:
              · 单层网格,每个日格子里独立 transform+opacity 揭示
              · (rowIdx + colIdx) 决定 delay → 对角波浪推进的视觉
              · 高光带是一个 translate3d 平移的 200% 大斜向 gradient 元素
              · 没有 mask-image / mix-blend-mode 等 CPU 慢路径
        */}
        <div className="relative flex-1 overflow-hidden">
          {/* 网格本体 —— 静态背景（边框/日期）+ 每格内的任务层独立动画 */}
          <div className="absolute inset-0 grid grid-cols-7" style={{ gridAutoRows: '1fr' }}>
            {cells.map((cell, idx) => {
              const day = cell.day;
              const isToday = day === today;
              const rowIdx = Math.floor(idx / 7);
              const colIdx = idx % 7;
              const dayTasks = day != null ? (tasksByDay.get(day) || []) : [];
              // 对角错位 delay：左上角第一个、右下角最后一个
              const revealDelay = 0.3 + (rowIdx + colIdx) * 0.1;
              return (
                <div
                  key={idx}
                  className="border-r border-b border-[#F1F5F9]"
                  style={{ padding: 6 }}
                >
                  {day != null && (
                    <>
                      {/* 静态日期数字（含今日红圈）—— 一直可见 */}
                      <div className="flex items-center justify-between mb-1.5" style={{ paddingLeft: 4 }}>
                        {isToday ? (
                          <span
                            className="flex items-center justify-center rounded-full text-white font-bold"
                            style={{ width: 22, height: 22, background: '#EF4444', fontSize: 12 }}
                          >
                            {day}
                          </span>
                        ) : (
                          <span className="font-semibold text-[#475569]" style={{ fontSize: 13 }}>{day}</span>
                        )}
                      </div>
                      {/* 任务卡 —— 每格按对角 delay 独立揭示 */}
                      {dayTasks.length > 0 && (
                        <div
                          className="flex flex-col"
                          style={{
                            gap: 3,
                            transformOrigin: 'center top',
                            willChange: reduced ? undefined : 'opacity, transform',
                            animation: reduced
                              ? undefined
                              : `calTaskReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${revealDelay}s both`,
                          }}
                        >
                          {dayTasks.slice(0, 5).map((t, i) => (
                            <TaskPill key={i} task={t} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* 浪峰白光带 —— 200% 大子元素带 135deg gradient,纯 translate3d 平移 */}
          {!reduced && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background:
                    'linear-gradient(135deg, transparent 47%, rgba(255,255,255,0.55) 50%, transparent 53%)',
                  transform: 'translate3d(-100%, -100%, 0)',
                  willChange: 'transform',
                  animation: 'calHighlightSweep 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CalendarScene(): JSX.Element {
  return (
    <AppShell activeNav="tasks">
      <CalendarMain />
    </AppShell>
  );
}
