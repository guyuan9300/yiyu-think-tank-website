# 行动者支持池 · 项目名册抽屉 — 合并交接

> **目标**：让首页 Ledger 第二张卡（"行动者支持池"）变成可点击的，点击后从中间弹出一个抽屉，展示该资金池正在支持的 5 个真实项目。
>
> **范围**：仅前端，只动 2 个文件，不碰后端、不碰其他卡片、不碰其他 section。
>
> **当前状态**：组件文件已建好、Ledger 已 import 并加 state，本地 `npx tsc --noEmit` 干净。这份文档是给"再次审核 / 重做 / 在新分支重放"的另一个线程的完整交接，包含**所有内容、设计规则、代码、验证步骤**。
>
> **示例数据警告**：本抽屉中的 5 个项目均为占位示例数据。上线前必须替换为真实账目（守 ANTI_FAKE 红线）。

---

## 0. 设计约束（不可违反）

1. **配色单色**：唯一强调色 `#2EA56F`（行动者支持池绿）。**不允许**出现其他色（紫/粉/橙/金等）。
2. **背景色对齐外卡**：抽屉面板内底色用 `bg-os-canvas`（`#F7F8FC`），与首页一致。
3. **字体对齐外卡**：抽屉 hero 大标题用 `font-serif-display`（Noto Serif SC），与 Ledger 区块 `<h2>` 保持同一字族；正文/数字保持 sans。
4. **卡片样式对齐外卡**：圆角 `20px`、`ring-1 ring-os-line` 描边、`shadow-os` 柔和阴影、hover 微抬升 + 偏绿光晕——和 `ui.tsx::Card` 一致。
5. **顶部锚点**：hero 顶端放一个 44×44 的 chip，圆角 13，背景 `bg-[#2EA56F]/12`，里面是 `Heart` icon 用 `#2EA56F` 描边——**与 Ledger 第二张卡的 chip 完全一致**，让用户一眼认出"这是它的延伸"。
6. **TS 规范**：不用 `any`、不用 `React.FC`、所有 props/exports 都用 `interface` 命名类型、不留 `console.log`。

---

## 1. 文件改动清单

| 文件 | 操作 | 行数变化 |
|---|---|---|
| `src/components/open-source-home/sections/SupportPoolProjects.tsx` | **新建** | ~340 行 |
| `src/components/open-source-home/sections/Ledger.tsx` | **编辑** | +5 行（1 import、1 state、2 prop、1 mount） |

不动其他文件。不改 tailwind config（绿色 `#2EA56F` 走 inline style，不进 token，因为它仅这一处使用）。

---

## 2. 新建文件：`SupportPoolProjects.tsx`

**路径**：`src/components/open-source-home/sections/SupportPoolProjects.tsx`

**完整内容**：

```tsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart } from 'lucide-react';

// ============================================================
// 行动者支持池 · 项目名册
// 点击 Ledger 第二张"行动者支持池"卡片时打开。
// ⚠️ 示例数据，上线前须替换为真实项目（守 ANTI_FAKE 红线）。
// ============================================================

interface ProjectStat {
  primary?: string;
  label: string;
}

interface Project {
  title: string;
  amount: number; // 万元
  budgetLabel: string;
  description: string;
  problem: string;
  stats: ProjectStat[];
  progress: number; // 0–100
}

const POOL_BALANCE = 52.68;
const POOL_THIS_MONTH = 17.32;
const POOL_CUMULATIVE = 25.81;
const ACCENT = '#2EA56F';

const PROJECTS: Project[] = [
  {
    title: '公益组织数字化平台支持',
    amount: 6.7,
    budgetLabel: '年度预算 12.00 万元',
    description: '为 68 家在册公益组织免费开通"益语智库"协作平台账号，并提供基础使用培训与一对一答疑。',
    problem:
      '大部分中小公益组织没有数字化工具，靠 Excel 和微信群协作——信息散、回看难、新人入职靠口口相传。做事的人把大量时间耗在"找信息、补信息"上。',
    stats: [
      { primary: '68', label: '家组织' },
      { primary: '312', label: '位活跃用户' },
      { label: '2024-08 起 · 持续运营' },
    ],
    progress: 56,
  },
  {
    title: '社会创新者数字工作坊(9 城)',
    amount: 12.0,
    budgetLabel: '项目总预算 14.50 万元',
    description: '为 9 个城市的 200+ 位社会创新者举办为期 8 周的数字化与 AI 应用培训，包含 6 场线下工作坊与 12 节线上直播。',
    problem:
      '行动者普遍愿意做事但缺少数字化方法。AI 工具更新得快，他们没有时间也没有渠道系统学习。这门课让他们能用上 AI 起草项目书、做数据汇报、搭最小可用产品。',
    stats: [
      { primary: '9', label: '个城市' },
      { primary: '235', label: '位在册学员' },
      { label: '2025-04-15 → 06-15' },
    ],
    progress: 83,
  },
  {
    title: '"小镇图书室"项目(3 个县镇)',
    amount: 2.8,
    budgetLabel: '本年度预算 6.00 万元',
    description: '在 3 个县级镇与本地行动者共同建立社区图书室，由本地志愿者团队日常运营，平台负责书目供给、培训和阶段补助。',
    problem:
      '县城及以下的孩子放学后没有稳定、有人陪伴的阅读空间。商业书店覆盖不到，学校图书室节假日不开。本地行动者愿意做，但需要稳定的启动资金和持续支持。',
    stats: [
      { primary: '3', label: '个镇已落地' },
      { primary: '612', label: '名儿童服务' },
      { label: '2024-09 起 · 持续' },
    ],
    progress: 47,
  },
  {
    title: '乡村美育志愿者驻校支持',
    amount: 1.45,
    budgetLabel: '本学期预算 3.20 万元',
    description: '为 4 所乡村小学补齐美术、音乐、戏剧课程。志愿者老师以"驻校两周 + 远程陪伴"的方式与本校老师协作，所有课件开源沉淀给学校。',
    problem:
      '乡村学校长期缺乏美育课，孩子的表达通道窄。派几次大课留不下东西，完全靠学校自有师资又不现实。这个项目让外部志愿者和本校老师共建课程，让东西真正留在学校。',
    stats: [
      { primary: '4', label: '所合作学校' },
      { primary: '420', label: '名学生覆盖' },
      { label: '学期制 · 2025 春' },
    ],
    progress: 45,
  },
  {
    title: '本地心理支持热线运营',
    amount: 2.86,
    budgetLabel: '季度预算 4.50 万元',
    description: '由 12 位经过专业培训的本地志愿者轮班，每周 5 天接听来电，主要服务弱势人群与处于急性情绪困境的来电者。',
    problem:
      '全国性热线常占线，弱势人群更难打通。"小而稳"的本地热线能补上这一段，但运营成本(话务、督导、志愿者补贴)是真实的、长期的——它需要一个稳定的小池子托着。',
    stats: [
      { primary: '12', label: '位值守志愿者' },
      { primary: '384', label: '次本月接听' },
      { label: '2024-03 起 · 持续' },
    ],
    progress: 64,
  },
];

// ============================================================
// 数字滚动 hook (按 active 触发)
// ============================================================
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface CountUpOptions {
  decimals?: number;
  duration?: number;
  active: boolean;
}

function useCountUp(target: number, options: CountUpOptions): string {
  const { decimals = 2, duration = 1500, active } = options;
  const [value, setValue] = useState<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min((now - start) / duration, 1);
      setValue(target * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, active]);

  return value.toFixed(decimals);
}

interface NumProps {
  value: number;
  decimals?: number;
  active: boolean;
  duration?: number;
}

function Num({ value, decimals = 2, active, duration }: NumProps): JSX.Element {
  const text = useCountUp(value, { decimals, duration, active });
  return <span className="tabular-nums">{text}</span>;
}

// ============================================================
// 项目卡片
// ============================================================
interface ProjectCardProps {
  project: Project;
  active: boolean;
  index: number;
}

function ProjectCard({ project, active, index }: ProjectCardProps): JSX.Element {
  const [barWidth, setBarWidth] = useState<string>('0%');

  useEffect(() => {
    if (!active) {
      setBarWidth('0%');
      return;
    }
    const t = setTimeout(() => setBarWidth(`${project.progress}%`), 380 + index * 60);
    return () => clearTimeout(t);
  }, [active, project.progress, index]);

  return (
    <article
      className="relative bg-os-paper rounded-[20px] px-8 sm:px-10 pt-9 pb-8 overflow-hidden cursor-pointer group"
      style={{
        boxShadow:
          'inset 0 0 0 1px #E3E6F1, 0 1px 2px rgba(20, 35, 63, .04), 0 8px 24px -14px rgba(20, 35, 63, .08)',
        transition: 'transform .35s cubic-bezier(.2,.7,.3,1), box-shadow .35s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow =
          'inset 0 0 0 1px rgba(46, 165, 111, .28), 0 1px 2px rgba(20, 35, 63, .04), 0 24px 40px -18px rgba(46, 165, 111, .22)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow =
          'inset 0 0 0 1px #E3E6F1, 0 1px 2px rgba(20, 35, 63, .04), 0 8px 24px -14px rgba(20, 35, 63, .08)';
      }}
    >
      {/* 头部:标题 + 金额 */}
      <div className="flex items-start justify-between gap-9 mb-4">
        <h3 className="flex-1 min-w-0 text-[20px] sm:text-[21px] font-bold text-os-navy leading-[1.4] tracking-[-0.01em]">
          {project.title}
        </h3>
        <div className="flex-shrink-0 text-right leading-none">
          <div className="text-[11.5px] text-os-muted mb-2 tracking-[0.04em]">已支持</div>
          <div className="text-[28px] sm:text-[30px] font-bold leading-none tabular-nums tracking-[-0.02em]" style={{ color: ACCENT }}>
            <Num value={project.amount} active={active} />
            <span className="text-[12px] text-os-muted font-medium ml-1">万元</span>
          </div>
          <div className="mt-1.5 text-[12px] text-[#9099b5] tabular-nums">{project.budgetLabel}</div>
        </div>
      </div>

      {/* 描述 */}
      <p className="text-[15px] text-os-ink leading-[1.9] mb-5 max-w-[760px]">{project.description}</p>

      {/* 解决什么 */}
      <div className="mb-6 max-w-[760px]">
        <div
          className="inline-flex items-center gap-[7px] text-[11px] uppercase font-bold mb-2.5 tracking-[0.16em]"
          style={{ color: ACCENT }}
        >
          <span className="inline-block w-1 h-1 rounded-full" style={{ background: ACCENT }} />
          解决什么
        </div>
        <p className="text-[14.5px] text-os-muted leading-[1.9]">{project.problem}</p>
      </div>

      {/* 底部:3 组指标 */}
      <div className="flex items-baseline gap-[22px] pt-5 border-t border-os-line flex-wrap">
        {project.stats.map((s, i) => (
          <span key={`${s.primary ?? ''}-${s.label}`} className="contents">
            {i > 0 && <span className="w-px h-3 bg-os-line self-center" />}
            <div className="inline-flex items-baseline gap-1.5 text-[13.5px]">
              {s.primary && (
                <span className="text-[16px] font-bold text-os-navy tabular-nums">{s.primary}</span>
              )}
              <span className="text-os-muted text-[13px]">{s.label}</span>
            </div>
          </span>
        ))}
      </div>

      {/* 卡底 3px 绿色进度条 */}
      <div className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: 'rgba(46, 165, 111, .10)' }}>
        <div
          className="h-full transition-[width] duration-[1600ms] ease-out rounded-r-[3px]"
          style={{ width: barWidth, background: ACCENT }}
        />
      </div>
    </article>
  );
}

// ============================================================
// 主面板内容
// ============================================================
interface PanelProps {
  active: boolean;
}

function SupportPoolPanel({ active }: PanelProps): JSX.Element {
  return (
    <div className="bg-os-canvas px-7 sm:px-12 lg:px-14 py-12 sm:py-16">
      {/* ===== Hero ===== */}
      <section className="mb-12 sm:mb-14">
        {/* 与外卡同款的 44px chip + Heart icon */}
        <div
          className="w-11 h-11 rounded-[13px] flex items-center justify-center mb-5"
          style={{ background: 'rgba(46, 165, 111, .12)' }}
          aria-hidden
        >
          <Heart className="w-[22px] h-[22px]" style={{ color: ACCENT }} strokeWidth={1.8} />
        </div>

        <div className="inline-block text-[12px] uppercase font-bold tracking-[0.16em] mb-3" style={{ color: ACCENT }}>
          行动者支持池
        </div>

        <h2 className="font-serif-display text-[30px] sm:text-[38px] lg:text-[42px] font-semibold leading-[1.3] tracking-tight text-os-navy mb-5">
          这笔钱,正在支持这些事情发生
        </h2>

        <p className="text-[16.5px] leading-[1.9] text-os-muted max-w-[620px]">
          行动者支持池只用于一件事——把钱送到那些已经在做事的人和组织手里。下面是它当前正在支持的真实项目。
        </p>

        {/* 4 个指标内联 */}
        <div className="mt-9 inline-flex flex-wrap items-baseline text-[14px] text-os-muted">
          <PulseItem
            value={<Num value={PROJECTS.length} decimals={0} active={active} duration={1000} />}
            unit="个"
            label="在持项目"
            greenValue
          />
          <PulseItem
            value={<Num value={POOL_CUMULATIVE} active={active} />}
            unit="万元"
            label="累计支持"
          />
          <PulseItem
            value={<Num value={POOL_THIS_MONTH} active={active} />}
            unit="万元"
            label="本月已支持"
          />
          <PulseItem
            value={<Num value={POOL_BALANCE} active={active} />}
            unit="万元"
            label="池子余额"
          />
        </div>
      </section>

      {/* ===== Section Label ===== */}
      <div className="flex items-baseline justify-between mb-[18px] px-1">
        <h3 className="text-[13px] font-semibold text-os-muted tracking-[0.04em]">正在支持的项目</h3>
        <span className="text-[12.5px] text-[#9099b5] tabular-nums">
          {PROJECTS.length} 个 · 累计 {POOL_CUMULATIVE.toFixed(2)} 万元
        </span>
      </div>

      {/* ===== Projects ===== */}
      <div className="flex flex-col gap-[18px]">
        {PROJECTS.map((p, i) => (
          <ProjectCard key={p.title} project={p} active={active} index={i} />
        ))}
      </div>

      {/* ===== Footnote ===== */}
      <div className="mt-12 text-center text-[12.5px] text-[#9099b5] leading-[1.8]">
        项目信息每月更新
        <span className="mx-3 text-os-line">·</span>
        所有当事人姓名与具体地点均已脱敏
        <span className="mx-3 text-os-line">·</span>
        最后更新 2025-05-26
      </div>
    </div>
  );
}

interface PulseItemProps {
  value: React.ReactNode;
  unit: string;
  label: string;
  greenValue?: boolean;
}

function PulseItem({ value, unit, label, greenValue }: PulseItemProps): JSX.Element {
  return (
    <div className="inline-flex items-baseline gap-[7px] pr-5 [&:not(:first-child)]:pl-5 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-os-line">
      <span
        className="text-[16px] font-bold tabular-nums text-os-navy"
        style={greenValue ? { color: ACCENT } : undefined}
      >
        {value} {unit}
      </span>
      <span className="text-[13px] text-os-muted">{label}</span>
    </div>
  );
}

// ============================================================
// 抽屉壳子 (createPortal + 背景遮罩 + ESC + 滚动锁)
// ============================================================
const DRAWER_CSS = `
@keyframes spdBackdropIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes spdPanelIn {
  from { opacity: 0; transform: translateY(24px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

interface SupportPoolDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SupportPoolDrawer({ open, onClose }: SupportPoolDrawerProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="行动者支持池 · 项目名册"
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-8"
    >
      <style>{DRAWER_CSS}</style>

      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-os-navy/45"
        style={{
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          animation: 'spdBackdropIn 0.28s ease both',
        }}
      />

      <div
        className="relative w-full sm:max-w-[1080px] max-h-screen sm:max-h-[88vh] overflow-y-auto rounded-none sm:rounded-3xl bg-os-canvas shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)]"
        style={{
          boxShadow: '0 40px 80px -20px rgba(15,23,42,0.45), inset 0 0 0 1px #E3E6F1',
          animation: 'spdPanelIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="sticky top-4 ml-auto mr-4 z-[3] flex h-9 w-9 items-center justify-center rounded-full bg-white text-os-muted ring-1 ring-os-line hover:text-os-navy hover:ring-os-navy/30 transition-all hover:scale-105 float-right"
        >
          <X className="w-4 h-4" />
        </button>
        <SupportPoolPanel active={open} />
      </div>
    </div>,
    document.body,
  );
}
```

---

## 3. 编辑文件：`Ledger.tsx`

**路径**：`src/components/open-source-home/sections/Ledger.tsx`

**说明**：`Ledger.tsx` 之前已经被改造过（数字滚动 hook + `LedgerCard.interactive` 机制 + 第一张卡接 `CashFlowDrawer`）。本次合并只需要在已有结构上**追加 4 处**：

### 3.1 顶部 import 行（紧跟现有 `CashFlowDrawer` import 之后）

```diff
 import { CashFlowDrawer } from './CashFlowStatement';
+import { SupportPoolDrawer } from './SupportPoolProjects';
```

### 3.2 `Ledger` 组件函数体顶端（紧跟现有 `cashFlowOpen` state 之后）

```diff
 export function Ledger() {
   const [cashFlowOpen, setCashFlowOpen] = useState<boolean>(false);
+  const [supportPoolOpen, setSupportPoolOpen] = useState<boolean>(false);
```

### 3.3 第二张卡（"行动者支持池"）的 `LedgerCard` 加 `interactive` + `onClick`

定位标记：注释 `{/* 2 · 行动者支持池 */}` 这一段。

```diff
-          {/* 2 · 行动者支持池 */}
+          {/* 2 · 行动者支持池(可点击,查看正在支持的项目) */}
           <Reveal delay={80}>
             <LedgerCard
               icon={Heart}
               accent="text-[#2EA56F]"
               chip="bg-[#2EA56F]/12"
               title="行动者支持池"
               bigNumber={<BigNumber target={52.68} />}
               unit="万元"
-              caption="专门用于支持行动者与公益组织的资金池，持续助力真实行动发生。"
+              caption="专门用于支持行动者与公益组织的资金池，持续助力真实行动发生。点击查看正在支持的项目。"
+              interactive
+              onClick={() => setSupportPoolOpen(true)}
             >
```

### 3.4 `</Container>` 之后、`</Section>` 之前，挂上抽屉（紧跟现有 `CashFlowDrawer` 之后）

```diff
       <CashFlowDrawer open={cashFlowOpen} onClose={() => setCashFlowOpen(false)} />
+      <SupportPoolDrawer open={supportPoolOpen} onClose={() => setSupportPoolOpen(false)} />
     </Section>
```

---

## 4. 项目数据（5 个示例项目，结构化）

| # | 项目名 | 已支持 | 预算 | 进度 | 简介 | 解决什么 | 指标 1 | 指标 2 | 时间 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 公益组织数字化平台支持 | 6.70 万 | 年度 12.00 万 | 56% | 为 68 家在册公益组织免费开通"益语智库"协作平台账号，并提供基础使用培训与一对一答疑。 | 大部分中小公益组织没有数字化工具，靠 Excel 和微信群协作——信息散、回看难、新人入职靠口口相传。做事的人把大量时间耗在"找信息、补信息"上。 | 68 家组织 | 312 位活跃用户 | 2024-08 起 · 持续运营 |
| 2 | 社会创新者数字工作坊（9 城） | 12.00 万 | 总 14.50 万 | 83% | 为 9 个城市的 200+ 位社会创新者举办为期 8 周的数字化与 AI 应用培训，包含 6 场线下工作坊与 12 节线上直播。 | 行动者普遍愿意做事但缺少数字化方法。AI 工具更新得快，他们没有时间也没有渠道系统学习。这门课让他们能用上 AI 起草项目书、做数据汇报、搭最小可用产品。 | 9 个城市 | 235 位在册学员 | 2025-04-15 → 06-15 |
| 3 | "小镇图书室"项目（3 个县镇） | 2.80 万 | 本年 6.00 万 | 47% | 在 3 个县级镇与本地行动者共同建立社区图书室，由本地志愿者团队日常运营，平台负责书目供给、培训和阶段补助。 | 县城及以下的孩子放学后没有稳定、有人陪伴的阅读空间。商业书店覆盖不到，学校图书室节假日不开。本地行动者愿意做，但需要稳定的启动资金和持续支持。 | 3 个镇已落地 | 612 名儿童服务 | 2024-09 起 · 持续 |
| 4 | 乡村美育志愿者驻校支持 | 1.45 万 | 本学期 3.20 万 | 45% | 为 4 所乡村小学补齐美术、音乐、戏剧课程。志愿者老师以"驻校两周 + 远程陪伴"的方式与本校老师协作，所有课件开源沉淀给学校。 | 乡村学校长期缺乏美育课，孩子的表达通道窄。派几次大课留不下东西，完全靠学校自有师资又不现实。这个项目让外部志愿者和本校老师共建课程，让东西真正留在学校。 | 4 所合作学校 | 420 名学生覆盖 | 学期制 · 2025 春 |
| 5 | 本地心理支持热线运营 | 2.86 万 | 季度 4.50 万 | 64% | 由 12 位经过专业培训的本地志愿者轮班，每周 5 天接听来电，主要服务弱势人群与处于急性情绪困境的来电者。 | 全国性热线常占线，弱势人群更难打通。"小而稳"的本地热线能补上这一段，但运营成本（话务、督导、志愿者补贴）是真实的、长期的——它需要一个稳定的小池子托着。 | 12 位值守志愿者 | 384 次本月接听 | 2024-03 起 · 持续 |

**池子合计指标**：
- 在持项目 5 个
- 累计支持 25.81 万元
- 本月已支持 17.32 万元
- 池子余额 52.68 万元

> 这四个数字与 Ledger 第二张卡上显示的数字（52.68 / 17.32 / 75%）必须对得上，且本月已支持 ≤ 累计 ≤ 池子规模。

---

## 5. 验证步骤

```bash
cd ~/openclaw/workspace/yiyu-think-tank-website

# 1. typecheck 必须干净
npx tsc --noEmit -p tsconfig.json

# 2. 起 dev server (如未在跑)
npm run dev

# 3. 浏览器打开
open 'http://localhost:5173/?page=open-source-home#ledger'
```

**人工验收**：

1. [ ] 滚到"这份礼物，应该被看见它如何发生"区块，4 张卡显示正常，没有视觉退化。
2. [ ] 鼠标移到第二张"行动者支持池"卡，光标变成 pointer，卡片轻微上抬。
3. [ ] 点击第二张卡，从屏幕中心淡入弹出抽屉。
4. [ ] 抽屉顶部：绿心 chip → "行动者支持池" → 衬线大标"这笔钱,正在支持这些事情发生"。
5. [ ] Hero 下方四个数字滚动出现：5 个、25.81 万、17.32 万、52.68 万。
6. [ ] 5 张长条项目卡按顺序错峰淡入，每张卡底的进度条按比例从 0 推到目标值。
7. [ ] 每张项目卡 hover 时上抬 + 描边变绿、阴影变绿。
8. [ ] 点击背景遮罩 / 按 ESC / 点右上角 X 按钮：抽屉关闭。
9. [ ] 抽屉打开时背后页面不能滚动；抽屉关闭后页面滚动恢复。
10. [ ] 手机宽度（≤640px）下抽屉变全屏，文字不挤压、不溢出。

---

## 6. 设计判断（为什么这么做）

- **为什么是抽屉而不是路由新页**：保持首页连贯性。看完项目就关掉，用户的滚动位置不丢失。同 SmartEditDemo 的 `Lightbox` 模式（参考 `sections/SmartEditDemo.tsx::SmartEditLightbox`）。
- **为什么单色不多色**：外卡每张是单色（蓝/绿/紫/橙），抽屉是它的"放大"，配色应该是该卡的延伸而不是引入新视觉系统。
- **为什么没用 status pill / 类别 chip**：每张项目卡只回答三件事——是什么、解决什么、花了多少。多余的状态徽章、类别标签会稀释这三件事。
- **为什么进度条贴在卡底而不放右侧 panel**：版面不切两栏，整张卡按从上到下读完一气呵成。进度条作为"暗示"放在边缘。
- **为什么用 inline style 而不是 tailwind config 加绿色 token**：`#2EA56F` 仅这一处使用，加 token 会污染设计系统；inline style 局部、隔离、易追溯。

---

## 7. 已知尾巴 / 可选后续

- 数据是常量，下一步可以接 `cloud_backend` 的真实账目 API（数据 schema 可参考 `PROJECTS` 数组的形状）。
- 当前没有按 month 过滤——抽屉只展示当前月。若后续要历史月份切换，可在 hero 加一个 `<button>‹ 2025 年 5 月 ›</button>` 组件（参考 `CashFlowStatement.tsx::PERIODS` 实现）。
- 5 张项目卡目前是写死顺序；后续可按"已支持金额降序"或"进度降序"自动排序。

---

**完整文件清单**：

```
新增  src/components/open-source-home/sections/SupportPoolProjects.tsx  (~340 行)
编辑  src/components/open-source-home/sections/Ledger.tsx                (+5 行,4 处)
新增  docs/SUPPORT_POOL_DRAWER_HANDOFF.md                                 (本文档)
```

**最后更新**：2026-05-28（Claude / Cary）
