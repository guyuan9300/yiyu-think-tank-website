// 场景3: 成长中心 — 复刻 V2.0 软件"成长中心 / 能力成长"页。
//
// 性质说明：
//   - AbilityRadar（六边形雷达图）：⭐ 1:1 搬自软件 GrowthCenterView.tsx，已在 ./ported/AbilityRadar.tsx
//   - 排名卡 / 能力卡列表：按软件 GROWTH_CSS 的视觉规范重画（CSS 类名规则取自软件，DOM 结构略简）
//   - 工作节奏热力图：⚠️ 软件 V2.0 源码中 grep "工作节奏" / "rhythm" 零命中，按截图3 自行实现
//   - 顶部 GROWTH CENTER header / 增长参谋按钮 / 2793 XP 数字 / tab 行：按截图重画
//
// 动效（沿用 Calendar 的全 GPU 路径，主线程零卡顿）：
//   - 雷达图 wholesale 中心 fade+scale（opacity + transform: scale）
//   - 6 行能力卡按 0.12s 错位 fadeUp（opacity + translate3d）
//   - 每行内进度条独立 transform: scaleX 0→1，transform-origin: left
//   - 热力图按列从左到右 0.04s 错位 fadeUp，整体波浪点亮
//   - 顶部 2,793 XP 用 requestAnimationFrame 计数从 0 飞升（视觉上和图表同步)
//   - 所有动效都用 transform / opacity，纯 GPU 合成线程
//   - 全部遵守 prefers-reduced-motion
//
// Canvas: 1280 × 920。主区域 1060 × 920（去掉 sidebar）。

import { useEffect, useState } from 'react';
import { Award, Sparkles, ArrowUpRight, Briefcase, Compass, Eye, Rocket, ShieldAlert, Users } from 'lucide-react';
import { AppShell } from './AppShell';
import { AbilityRadar } from '../ported/AbilityRadar';
import type { GrowthAbilityScore } from '../ported/growthTypes';
import { useLang, type Bilingual } from '../../../../lib/i18n';

// 雷达图数据（顺序对应截图3中六边形从顶部顺时针：资源调配 → 组织建设 → 战略判断 → 远见洞察 → 危机决策 → 对外影响）
const SAMPLE_ABILITIES: GrowthAbilityScore[] = [
  {
    abilityKey: 'resource',
    label: '资源调配',
    currentScore: 72,
    previousScore: 60,
    totalXp: 781,
    weeklyXp: 62,
    stage: '独立',
    nextStage: '上手',
    evidence: '完成任务 206 条，最新「今天要把为爱黔行整个工作坊落地」，承诺已履约 20 条，最新「全程跟进推动足球项目落地」，任务复盘 24 条 · 最新',
  },
  {
    abilityKey: 'org',
    label: '组织建设',
    currentScore: 25,
    previousScore: 18,
    totalXp: 98,
    weeklyXp: 51,
    stage: '上手',
    nextStage: '稳态',
    evidence: '周复盘 7 条，最新「2026-W18 周复盘」，手册条目 21 条，最新「核心管理团队优先对齐彼此的管理边界认知，才能避免因权贵分歧公开争执」',
  },
  {
    abilityKey: 'strategy',
    label: '战略判断',
    currentScore: 53,
    previousScore: 48,
    totalXp: 345,
    weeklyXp: 12,
    stage: '稳态',
    nextStage: '独立',
    evidence: '手册条目 21 条，最新「核心管理团队优先对齐彼此的管理边界认知，才能避免因权贵分歧公开争执，进而引发不必要的内部矛盾与团队内」，周',
  },
  {
    abilityKey: 'foresight',
    label: '远见洞察',
    currentScore: 52,
    previousScore: 50,
    totalXp: 329,
    weeklyXp: 22,
    stage: '稳态',
    nextStage: '独立',
    evidence: '手册条目 21 条，最新「核心管理团队优先对齐彼此的管理边界认知，才能避免因权贵分歧公开争执，进而引发不必要的内部矛盾与团队内」，客',
  },
  {
    abilityKey: 'crisis',
    label: '危机决策',
    currentScore: 68,
    previousScore: 65,
    totalXp: 650,
    weeklyXp: 0,
    stage: '独立',
    nextStage: '上手',
    evidence: '接触客户的风险信号 52 条，最新「南沙区 2026 年公益创投新增青少年心理健康服务平台方向」，手册条目 21 条，最新「核心管理团队优先对齐」',
  },
  {
    abilityKey: 'influence',
    label: '对外影响',
    currentScore: 66,
    previousScore: 58,
    totalXp: 590,
    weeklyXp: 73,
    stage: '独立',
    nextStage: '上手',
    evidence: '上传/产出文档 501 条，手册条目 21 条，最新「核心管理团队优先对齐彼此的管理边界认知，才能避免因权贵分歧公开争执，进而引发不必要的内部矛盾与团队内」',
  },
];

// 能力字段的英文叠加（zh 原文已在 SAMPLE_ABILITIES，这里只补 en，渲染处按 abilityKey 取）
interface AbilityI18n {
  label: Bilingual;
  stage: Bilingual;
  nextStage: Bilingual;
  evidence: Bilingual;
}
const ABILITY_I18N: Record<string, AbilityI18n> = {
  resource: {
    label: { zh: '资源调配', en: 'Resource Allocation' },
    stage: { zh: '独立', en: 'Independent' },
    nextStage: { zh: '上手', en: 'Proficient' },
    evidence: { zh: '完成任务 206 条，最新「今天要把为爱黔行整个工作坊落地」，承诺已履约 20 条，最新「全程跟进推动足球项目落地」，任务复盘 24 条 · 最新', en: '206 tasks completed, latest “Land the full Weiaiqian workshop today”; 20 commitments fulfilled, latest “Drove the football project to landing end-to-end”; 24 task reviews · latest' },
  },
  org: {
    label: { zh: '组织建设', en: 'Org Building' },
    stage: { zh: '上手', en: 'Proficient' },
    nextStage: { zh: '稳态', en: 'Steady' },
    evidence: { zh: '周复盘 7 条，最新「2026-W18 周复盘」，手册条目 21 条，最新「核心管理团队优先对齐彼此的管理边界认知，才能避免因权贵分歧公开争执」', en: '7 weekly reviews, latest “2026-W18 weekly review”; 21 handbook entries, latest “The core management team should first align on each other’s management boundaries to avoid open disputes over authority”' },
  },
  strategy: {
    label: { zh: '战略判断', en: 'Strategic Judgment' },
    stage: { zh: '稳态', en: 'Steady' },
    nextStage: { zh: '独立', en: 'Independent' },
    evidence: { zh: '手册条目 21 条，最新「核心管理团队优先对齐彼此的管理边界认知，才能避免因权贵分歧公开争执，进而引发不必要的内部矛盾与团队内」，周', en: '21 handbook entries, latest “The core management team should first align on management boundaries to avoid open disputes over authority and the resulting internal friction”; weekly' },
  },
  foresight: {
    label: { zh: '远见洞察', en: 'Foresight' },
    stage: { zh: '稳态', en: 'Steady' },
    nextStage: { zh: '独立', en: 'Independent' },
    evidence: { zh: '手册条目 21 条，最新「核心管理团队优先对齐彼此的管理边界认知，才能避免因权贵分歧公开争执，进而引发不必要的内部矛盾与团队内」，客', en: '21 handbook entries, latest “The core management team should first align on management boundaries to avoid open disputes over authority and the resulting internal friction”; client' },
  },
  crisis: {
    label: { zh: '危机决策', en: 'Crisis Decisions' },
    stage: { zh: '独立', en: 'Independent' },
    nextStage: { zh: '上手', en: 'Proficient' },
    evidence: { zh: '接触客户的风险信号 52 条，最新「南沙区 2026 年公益创投新增青少年心理健康服务平台方向」，手册条目 21 条，最新「核心管理团队优先对齐」', en: '52 client risk signals, latest “Nansha 2026 charity venture adds a youth mental-health service platform track”; 21 handbook entries, latest “The core management team should first align”' },
  },
  influence: {
    label: { zh: '对外影响', en: 'External Influence' },
    stage: { zh: '独立', en: 'Independent' },
    nextStage: { zh: '上手', en: 'Proficient' },
    evidence: { zh: '上传/产出文档 501 条，手册条目 21 条，最新「核心管理团队优先对齐彼此的管理边界认知，才能避免因权贵分歧公开争执，进而引发不必要的内部矛盾与团队内」', en: '501 documents uploaded/produced; 21 handbook entries, latest “The core management team should first align on management boundaries to avoid open disputes over authority and the resulting internal friction”' },
  },
};

// 能力 icon + 配色（按截图3：六个能力对应不同 tint 底）
const ABILITY_VIS: Record<string, { icon: typeof Rocket; bg: string; color: string }> = {
  resource: { icon: Rocket, bg: '#EFF6FF', color: '#2563EB' },
  org: { icon: Users, bg: '#F0F9FF', color: '#0284C7' },
  strategy: { icon: Compass, bg: '#FAF5FF', color: '#7C3AED' },
  foresight: { icon: Eye, bg: '#ECFDF5', color: '#059669' },
  crisis: { icon: ShieldAlert, bg: '#FEF3C7', color: '#D97706' },
  influence: { icon: Briefcase, bg: '#EEF2FF', color: '#4F46E5' },
};

const STATE_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  独立: { bg: '#EFF6FF', color: '#2563EB' },
  上手: { bg: '#F0FDF4', color: '#16A34A' },
  稳态: { bg: '#FAF5FF', color: '#7C3AED' },
};

// ── 动效 keyframes（全 GPU 路径：opacity / transform，主线程零卡顿） ──
const GROW_SCENE_CSS = `
@keyframes growFadeUp {
  0%   { opacity: 0; transform: translate3d(0, 10px, 0); }
  100% { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes growBarFill {
  0%   { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
@keyframes growRadarPop {
  0%   { opacity: 0; transform: scale(0.86); }
  60%  { opacity: 1; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes growSquareFill {
  0%   { opacity: 0; transform: scale(0.55); }
  100% { opacity: 1; transform: scale(1); }
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

// 用 requestAnimationFrame 把数字从 0 平滑算到 target。
// 反正 60fps 都跑得过来——单一 state 更新比 CSS 关键帧上的"数字插值"靠谱（CSS 没法插值数字内容）。
function useCountUp(target: number, durationMs: number, delayMs: number, disabled: boolean): number {
  const [value, setValue] = useState<number>(disabled ? target : 0);
  useEffect(() => {
    if (disabled) {
      setValue(target);
      return;
    }
    setValue(0);
    let cancelled = false;
    let raf: number | null = null;
    let startTime: number | null = null;
    const startTimer = setTimeout(() => {
      if (cancelled) return;
      const tick = (now: number): void => {
        if (cancelled) return;
        if (startTime == null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [target, durationMs, delayMs, disabled]);
  return value;
}

interface AbilityRowProps {
  ab: GrowthAbilityScore;
  index: number;
  reduced: boolean;
}

function AbilityRow({ ab, index, reduced }: AbilityRowProps): JSX.Element {
  const { t } = useLang();
  const vis = ABILITY_VIS[ab.abilityKey] || ABILITY_VIS.resource;
  const Icon = vis.icon;
  const i18n = ABILITY_I18N[ab.abilityKey];
  const badge = STATE_BADGE_STYLE[ab.stage] || STATE_BADGE_STYLE['独立'];
  const trendDelta = Math.max(1, Math.round(ab.weeklyXp / 15));
  const rowDelay = 0.3 + index * 0.12;
  const barDelay = rowDelay + 0.2;
  return (
    <div
      style={
        reduced
          ? undefined
          : {
              animation: `growFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${rowDelay}s both`,
              willChange: 'opacity, transform',
            }
      }
    >
      {/* 顶行：左 icon + name + 状态 / 右 趋势 + XP + delta */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 26, height: 26, background: vis.bg }}>
            <Icon size={13} color={vis.color} />
          </div>
          <span className="font-semibold text-[#1E293B]" style={{ fontSize: 13 }}>{i18n ? t(i18n.label) : ab.label}</span>
          <span className="rounded-full font-bold" style={{ padding: '2px 8px', fontSize: 10, background: badge.bg, color: badge.color }}>
            {i18n ? t(i18n.stage) : ab.stage}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ArrowUpRight size={13} color="#10B981" />
          <span className="font-medium text-[#10B981]" style={{ fontSize: 11 }}>↑{trendDelta}</span>
          <span className="font-bold text-[#3A4FB5]" style={{ fontSize: 13 }}>{ab.totalXp} XP</span>
          {ab.weeklyXp > 0 && (
            <span className="font-semibold text-[#10B981]" style={{ fontSize: 11 }}>+{ab.weeklyXp}</span>
          )}
        </div>
      </div>
      {/* 进度条 —— 用 transform: scaleX 0→1 走 GPU 合成（不用 width 动画，width 会触发 layout） */}
      <div className="rounded-full overflow-hidden" style={{ height: 5, background: '#F1F5F9' }}>
        <div
          className="rounded-full"
          style={{
            height: '100%',
            width: `${Math.min(ab.currentScore, 100)}%`,
            background: '#5B7BFE',
            transformOrigin: 'left center',
            animation: reduced
              ? undefined
              : `growBarFill 0.75s cubic-bezier(0.16, 1, 0.3, 1) ${barDelay}s both`,
            willChange: reduced ? undefined : 'transform',
          }}
        />
      </div>
      {/* 证据 */}
      <div className="text-[#94A3B8] truncate" style={{ fontSize: 10.5, marginTop: 4 }}>{i18n ? t(i18n.evidence) : ab.evidence}</div>
    </div>
  );
}

// 工作节奏热力图 —— 软件 V2.0 源码无此组件，按截图3 实现。
// 3 个月（3/4/5月），每月按周列 × 周内天数行 排布。
//
// 动效（"从少变多"按强度累积）：
//   - 强度 0 的格子（清闲日）静态显示，作为基底骨架（看起来是浅灰背景网格）
//   - 强度 1-4 的格子按 intensity 排队 fadeIn:
//       低强度先（intensity 1 起步 0.3s），高强度最后（intensity 4 起步 ~1.0s）
//   - 同强度内加少量伪随机 jitter（基于格子的 grid 坐标），避免齐刷刷
//   - 视觉效果：背景网格先在，活动数据从淡到深累积进来 = "工作逐渐填满日历"
function RhythmHeatmap({ reduced }: { reduced: boolean }): JSX.Element {
  const { t } = useLang();
  const months: Array<{ label: Bilingual; year: number; monthIdx: number }> = [
    { label: { zh: '3月', en: 'Mar' }, year: 2026, monthIdx: 2 },
    { label: { zh: '4月', en: 'Apr' }, year: 2026, monthIdx: 3 },
    { label: { zh: '5月', en: 'May' }, year: 2026, monthIdx: 4 },
  ];

  // 简易 PRNG (mulberry32) — 让强度可复现
  function makeRng(seed: number): () => number {
    let s = seed;
    return () => {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rng = makeRng(20260526);
  const SHADES = ['#F1F5F9', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8'];

  function intensity(): number {
    const r = rng();
    if (r < 0.55) return 0;
    if (r < 0.78) return 1;
    if (r < 0.9) return 2;
    if (r < 0.97) return 3;
    return 4;
  }

  // 强度 → 入场延迟范围（秒）。低强度先，高强度后。
  const INTENSITY_BASE_DELAY: Record<number, number> = { 1: 0.3, 2: 0.5, 3: 0.75, 4: 1.0 };

  return (
    <div className="flex gap-6 items-start">
      {months.map((m) => {
        const firstOfMonth = new Date(m.year, m.monthIdx, 1);
        const daysInMonth = new Date(m.year, m.monthIdx + 1, 0).getDate();
        const offset = (firstOfMonth.getDay() + 6) % 7;
        const totalCells = offset + daysInMonth;
        const cols = Math.ceil(totalCells / 7);
        const grid: (number | null)[][] = [];
        for (let c = 0; c < cols; c += 1) {
          const col: (number | null)[] = [];
          for (let r = 0; r < 7; r += 1) {
            const idx = c * 7 + r;
            if (idx < offset || idx >= offset + daysInMonth) {
              col.push(null);
            } else {
              col.push(intensity());
            }
          }
          grid.push(col);
        }
        return (
          <div key={m.label.zh}>
            <div className="text-[#94A3B8] font-medium mb-2" style={{ fontSize: 11 }}>{t(m.label)}</div>
            <div className="flex gap-[3px]">
              {grid.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((v, ri) => {
                    if (v == null) {
                      return <div key={ri} style={{ width: 14, height: 14 }} />;
                    }
                    const base = { width: 14, height: 14, borderRadius: 3, background: SHADES[v] };
                    if (reduced || v === 0) {
                      // 强度 0 = 基底骨架，不动效
                      return <div key={ri} style={base} />;
                    }
                    // 按强度 base delay + 基于(月份+列+行)的伪随机 jitter（~0-0.2s）
                    const jitter = (((m.monthIdx * 53) + ci * 11 + ri * 17) % 100) / 100 * 0.2;
                    const delay = (INTENSITY_BASE_DELAY[v] ?? 0.3) + jitter;
                    return (
                      <div
                        key={ri}
                        style={{
                          ...base,
                          animation: `growSquareFill 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both`,
                          willChange: 'opacity, transform',
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GrowthMain(): JSX.Element {
  const reduced = useReducedMotion();
  const { t } = useLang();
  // 顶部 / 排名卡共用同一个计数 —— 1.2s 内从 0 → 2,793
  const xpCount = useCountUp(2793, 1200, 200, reduced);
  // 雷达图标签按当前语言翻译（不可变拷贝，不改原数据）
  const radarAbilities = SAMPLE_ABILITIES.map((ab) => {
    const i18n = ABILITY_I18N[ab.abilityKey];
    return i18n ? { ...ab, label: t(i18n.label) } : ab;
  });

  return (
    <div className="h-full overflow-hidden" style={{ padding: '24px 30px' }}>
      <style>{GROW_SCENE_CSS}</style>

      {/* 顶部 header */}
      <header className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[#94A3B8] font-bold tracking-[2px] mb-1.5" style={{ fontSize: 11 }}>
            GROWTH CENTER
          </div>
          <h1 className="font-bold tracking-tight text-[#0F172A] mb-1" style={{ fontSize: 26 }}>
            {t({ zh: '成长中心', en: 'Growth Center' })}
          </h1>
          <div className="text-[#64748B]" style={{ fontSize: 13 }}>{t({ zh: '把工作经验变成组织资产', en: 'Turn work experience into organizational assets' })}</div>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white text-[#475569]" style={{ padding: '7px 14px', fontSize: 12.5 }}>
            <Sparkles size={13} color="#3A4FB5" />
            <span className="font-medium">{t({ zh: '增长参谋 · 一阶', en: 'Growth Advisor · Tier 1' })}</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-[#0F172A] tracking-tight tabular-nums" style={{ fontSize: 26 }}>
              {xpCount.toLocaleString()} <span className="font-medium text-[#94A3B8]" style={{ fontSize: 14 }}>XP</span>
            </div>
            <div className="text-emerald-600 font-semibold" style={{ fontSize: 12 }}>+220</div>
          </div>
        </div>
      </header>

      {/* tabs */}
      <div className="flex items-center gap-7 border-b border-[#F1F5F9] mb-5">
        <div className="text-[#94A3B8]" style={{ paddingBottom: 10, fontSize: 13 }}>{t({ zh: '经验墙', en: 'Experience Wall' })}</div>
        <div className="text-[#3A4FB5] font-semibold border-b-2 border-[#3A4FB5]" style={{ paddingBottom: 10, fontSize: 13 }}>
          {t({ zh: '能力成长', en: 'Ability Growth' })}
        </div>
        <div className="text-[#94A3B8]" style={{ paddingBottom: 10, fontSize: 13 }}>{t({ zh: '徽章与排行', en: 'Badges & Ranking' })}</div>
      </div>

      {/* 卡片1: 雷达 + 能力列表 */}
      <div className="rounded-[20px] border border-[#E0E7FF] bg-white mb-4 overflow-hidden" style={{ boxShadow: '0 18px 40px rgba(148,163,184,0.06)' }}>
        <div className="flex" style={{ padding: '24px 28px' }}>
          {/* 左：排名卡 + 雷达 */}
          <div className="flex flex-col items-center" style={{ width: 400, paddingRight: 28 }}>
            <div className="w-full rounded-2xl flex items-center justify-between mb-4" style={{ padding: '14px 18px', background: '#F8FAFC' }}>
              <div>
                <div className="text-[#94A3B8] font-medium" style={{ fontSize: 11 }}>{t({ zh: '成长速度 · 机构成长榜', en: 'Growth Pace · Org Leaderboard' })}</div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-[#64748B]" style={{ fontSize: 12 }}>{t({ zh: '排', en: 'Rank' })}</span>
                  <span className="font-bold text-[#0F172A]" style={{ fontSize: 22 }}>{t({ zh: '第 1', en: '#1' })}</span>
                  <span className="text-[#94A3B8]" style={{ fontSize: 11 }}>{t({ zh: '/ 共 3 人', en: '/ of 3' })}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#0F172A] tracking-tight tabular-nums" style={{ fontSize: 22 }}>
                  {xpCount.toLocaleString()} <span className="font-medium text-[#94A3B8]" style={{ fontSize: 11 }}>XP</span>
                </div>
              </div>
            </div>
            {/* 雷达图 wholesale 中心 fade+scale */}
            <div
              style={
                reduced
                  ? undefined
                  : {
                      animation: 'growRadarPop 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
                      transformOrigin: 'center center',
                      willChange: 'opacity, transform',
                    }
              }
            >
              <AbilityRadar abilities={radarAbilities} />
            </div>
            <div className="flex items-center gap-4 text-[#94A3B8] mt-2" style={{ fontSize: 11 }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#5B7BFE' }} />{t({ zh: '当前', en: 'Current' })}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#CBD5E1' }} />{t({ zh: '上期', en: 'Previous' })}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />{t({ zh: '要求', en: 'Target' })}</span>
            </div>
          </div>

          {/* 右：能力卡列表 */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {SAMPLE_ABILITIES.map((ab, i) => (
              <AbilityRow key={ab.abilityKey} ab={ab} index={i} reduced={reduced} />
            ))}
          </div>
        </div>
      </div>

      {/* 卡片2: 工作节奏热力图 */}
      <div className="rounded-[20px] border border-[#E0E7FF] bg-white" style={{ padding: '20px 28px', boxShadow: '0 18px 40px rgba(148,163,184,0.06)' }}>
        <div className="flex items-baseline justify-between mb-4">
          <div className="font-bold text-[#0F172A]" style={{ fontSize: 14 }}>{t({ zh: '工作节奏', en: 'Work Rhythm' })}</div>
          <div className="text-[#94A3B8]" style={{ fontSize: 11 }}>
            {t({ zh: '近 85 天 · 活跃 33 天（39%）· 最长连续 6 天', en: 'Last 85 days · 33 active (39%) · longest streak 6 days' })}
          </div>
        </div>
        <RhythmHeatmap reduced={reduced} />
        <div className="flex items-center justify-between mt-3.5">
          <div className="text-[#94A3B8] font-medium" style={{ fontSize: 11 }}>{t({ zh: '634 分产出 / 2026 年', en: '634 output points / 2026' })}</div>
          <div className="flex items-center gap-1.5 text-[#94A3B8]" style={{ fontSize: 11 }}>
            <span>{t({ zh: '清闲', en: 'Light' })}</span>
            {['#F1F5F9', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8'].map((c) => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            ))}
            <span>{t({ zh: '工作多', en: 'Busy' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GrowthScene(): JSX.Element {
  return (
    <AppShell activeNav="growth">
      <GrowthMain />
    </AppShell>
  );
}
