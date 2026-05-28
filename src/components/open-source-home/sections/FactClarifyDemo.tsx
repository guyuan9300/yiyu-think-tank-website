// FactClarifyDemo + FactClarifyLightbox — Features Card #01 的"点击弹横屏悬浮窗"演示。
//
// 结构：
//   FactClarifyLightbox  外层：fixed 全屏 + 毛玻璃 backdrop + 居中横屏白色面板 + ESC/点遮罩关闭
//   FactClarifyDemo      内层：实际的事实澄清动画演示
//
// 性质说明：
//   - 视觉/文案/类名 = ⭐ 1:1 复刻 V2.1 主仓
//     src/renderer/components/strategic_accompaniment/GlossaryAttributeReviewSection.tsx
//     （第 175–423 行 JSX 结构 + 第 52–60 行 CATEGORY_META + 第 142 行 modal 文案 + 字号/padding 全套）
//   - 分镜节奏 = 官网这边自家写（软件原件用浏览器原生 confirm()，没有动画）
//   - 全 GPU 路径：opacity + transform + requestAnimationFrame，主线程零卡顿
//
// 分镜（6.5 秒）：
//   t=0      初始：81 待审 · 72 高置信；金额已展开，4 条事实卡同时可见
//   t=0-2s   静态展示，让用户看清里面是什么东西
//   t=2.0s   "一键采纳" chip 开始 pulse 提示可点
//   t=3.0s   chip "按下"（scale press 0.3s）
//   t=3.4s   模态弹出（macOS 风格 confirm 视觉）
//   t=4.1s   OK 按钮脉冲
//   t=4.5s   模态退出
//   t=4.7s   数字开始倒计时：81→9、72→0（chip badge 跟着滑下来）、各类计数下降，人物/地点淡出
//   t=6.2s   倒计时完成，chip 在 count=0 时消失
//   t=6.5s   动画结束 → 末态保持，右上角 replay 出现

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  CircleDollarSign,
  MapPin,
  RotateCcw,
  Tag,
  User,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// ── 从源码 CATEGORY_META 原样搬运 ──
const CATEGORY_ICON: Record<string, LucideIcon> = {
  amount: CircleDollarSign,
  date: CalendarDays,
  person: User,
  location: MapPin,
  text: Tag,
};

// 模拟 amount 类展开的 4 条事实卡（按截图2转写）—— 字段结构对齐源码 GlossaryAttributeRecord
interface AmountItem {
  term: string;
  attribute_name: string;
  source_label: string; // 软件原件来自 SOURCE_META[ai_inferred] = '资料抽取'
  confidence: number; // 0-1
  value_text: string;
  value_unit?: string;
  scope?: string;
  source_evidence?: string;
}

const AMOUNT_ITEMS: AmountItem[] = [
  {
    term: '公益项目资助标准',
    attribute_name: '中等额度资助额',
    source_label: '资料抽取',
    confidence: 0.95,
    value_text: '50000',
    value_unit: '元',
    scope: '项目通用',
    source_evidence: '字典说明',
  },
  {
    term: '公益项目资助标准',
    attribute_name: '单笔支出额',
    source_label: '资料抽取',
    confidence: 0.95,
    value_text: '13万',
    value_unit: '元',
    scope: '项目通用',
    source_evidence: '字典说明',
  },
  {
    term: '公益项目资助标准',
    attribute_name: '小额资助额',
    source_label: '资料抽取',
    confidence: 0.95,
    value_text: '20000',
    value_unit: '元',
    scope: '项目通用',
    source_evidence: '字典说明',
  },
  {
    term: '公益项目资助标准',
    attribute_name: '最小额度资助额',
    source_label: '资料抽取',
    confidence: 0.95,
    value_text: '5000',
    value_unit: '元',
    scope: '项目通用',
    source_evidence: '字典说明',
  },
];

// ── 一次性注入：脉冲提示 + 事实卡入场/退场 + 模态进入/退出 ──
const FCD_CSS = `
@keyframes fcdPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(91, 123, 254, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(91, 123, 254, 0); }
}
.fcd-pulse {
  animation: fcdPulse 0.9s ease-in-out infinite;
}
@keyframes fcdChipPress {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.93); }
  100% { transform: scale(1); }
}
.fcd-chip-press {
  animation: fcdChipPress 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}
@keyframes fcdItemOut {
  0%   { opacity: 1; transform: translate3d(0, 0, 0); max-height: 200px; padding-top: 12px; padding-bottom: 12px; }
  100% { opacity: 0; transform: translate3d(0, -4px, 0); max-height: 0; padding-top: 0; padding-bottom: 0; }
}
@keyframes fcdModalEnter {
  0%   { opacity: 0; transform: scale(0.92); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes fcdModalExit {
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.96); }
}
@keyframes fcdBackdropEnter {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes fcdBackdropExit {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
`;

// 单调缓动：cubic ease-out。
function tween(elapsed: number, fromValue: number, toValue: number, fromMs: number, toMs: number): number {
  if (elapsed <= fromMs) return fromValue;
  if (elapsed >= toMs) return toValue;
  const t = (elapsed - fromMs) / (toMs - fromMs);
  const eased = 1 - Math.pow(1 - t, 3);
  return fromValue + (toValue - fromValue) * eased;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

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

// 关键时间节点（毫秒）—— 整体节奏：t=0–2s 静态展示 → t=2s 起 pulse → t=3s 按下 → 然后倒计时
const T_CHIP_PULSE_START = 2000;
const T_CHIP_PULSE_END = 3000;
const T_CHIP_CLICK = 3000; // chip "按下" press 动效起点（持续 ~300ms）
const T_MODAL_ENTER_START = 3400;
const T_MODAL_ENTER_END = 3700;
const T_OK_PULSE_START = 4100;
const T_MODAL_EXIT_START = 4500;
const T_MODAL_EXIT_END = 4700;
const T_COUNTDOWN_START = 4700;
const T_COUNTDOWN_END = 6200;
const T_AMOUNT_ITEMS_UNMOUNT = 5700; // 倒计时进行中，事实卡 fade-out 完毕的时间
const T_FINAL = 6500;
const T_LOOP_LIMIT = 7000;

export function FactClarifyDemo(): JSX.Element {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // 滚动入视口触发一次自动播
  useEffect(() => {
    if (!ref.current) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          ob.unobserve(entry.target);
        }
      },
      { threshold: 0.35 },
    );
    ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);

  // RAF tick：基于 active + replayKey 重置 elapsed=0 并往前走
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      // 降级：直接显示末态
      setElapsed(T_FINAL);
      return;
    }
    setElapsed(0);
    let raf: number | null = null;
    let start: number | null = null;
    const tick = (now: number): void => {
      if (start == null) start = now;
      const e = now - start;
      setElapsed(e);
      if (e < T_LOOP_LIMIT) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [active, replayKey, reduced]);

  const replay = (): void => {
    setReplayKey((k) => k + 1);
  };

  // ── 派生状态 ──
  const pendingCount = Math.round(tween(elapsed, 81, 9, T_COUNTDOWN_START, T_COUNTDOWN_END));
  const highConfCount = Math.round(tween(elapsed, 72, 0, T_COUNTDOWN_START, T_COUNTDOWN_END));
  const amountCount = Math.round(tween(elapsed, 21, 2, T_COUNTDOWN_START, T_COUNTDOWN_END));
  const dateCount = Math.round(tween(elapsed, 4, 1, T_COUNTDOWN_START, T_COUNTDOWN_END));
  const personCount = Math.round(tween(elapsed, 2, 0, T_COUNTDOWN_START, T_COUNTDOWN_END));
  const locationCount = Math.round(tween(elapsed, 1, 0, T_COUNTDOWN_START, T_COUNTDOWN_END));
  const textCount = Math.round(tween(elapsed, 53, 6, T_COUNTDOWN_START, T_COUNTDOWN_END));

  // 金额从一开始就展开（4 条事实卡同时可见），直到倒计时阶段 fade-out
  const showAmountItems = elapsed < T_AMOUNT_ITEMS_UNMOUNT;
  // 金额行的 chevron 朝向：倒计时开始前是"展开（▼）"，倒计时开始后是"收起（▶）"
  const amountExpanded = elapsed < T_COUNTDOWN_START;
  const showModal = !reduced && elapsed >= T_MODAL_ENTER_START && elapsed < T_MODAL_EXIT_END;
  const chipPulse = !reduced && elapsed >= T_CHIP_PULSE_START && elapsed < T_CHIP_PULSE_END;
  // chip"按下" press 动效，持续 300ms
  const chipPressing = !reduced && elapsed >= T_CHIP_CLICK && elapsed < T_CHIP_CLICK + 300;
  const okPulse = !reduced && elapsed >= T_OK_PULSE_START && elapsed < T_MODAL_EXIT_START;
  const modalExiting = elapsed >= T_MODAL_EXIT_START;
  const showReplay = elapsed >= T_FINAL;

  // 人物/地点的淡出（在倒计时阶段消失）
  const personOpacity = clamp(1 - (elapsed - (T_COUNTDOWN_START + 200)) / 700, 0, 1);
  const locationOpacity = clamp(1 - (elapsed - (T_COUNTDOWN_START + 350)) / 700, 0, 1);
  const personGone = personOpacity <= 0;
  const locationGone = locationOpacity <= 0;

  return (
    <div ref={ref} className="relative">
      <style>{FCD_CSS}</style>

      {/* Header —— 1:1 复刻源码 175–207 行 */}
      <header className="mb-6 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h3 className="text-[20px] font-light tracking-tight text-gray-900">事实澄清</h3>
          <p className="mt-1 text-[12px] text-gray-400 leading-relaxed">
            AI 替你抽出待确认事实 · 一键审过后进入客户档案权威值，后续问答与报告自动引用
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4 tabular-nums">
          <span className="inline-flex items-baseline gap-1 text-[11px] text-gray-400">
            <span className="text-[15px] font-semibold text-gray-900">{pendingCount}</span>
            待审
          </span>
          {highConfCount > 0 && (
            <>
              <span className="text-gray-200">·</span>
              <span className="inline-flex items-baseline gap-1 text-[11px] text-gray-400">
                <span className="text-[15px] font-semibold text-[#5B7BFE]">{highConfCount}</span>
                高置信
              </span>
            </>
          )}
        </div>
      </header>

      {/* 一键采纳 chip —— 1:1 复刻源码 210–222 行。badge 数字跟 highConfCount 实时联动（72→0） */}
      {highConfCount > 0 && (
        <div
          className={`mb-3 inline-flex items-center gap-2 rounded-md border border-[#5B7BFE]/30 bg-[#5B7BFE]/5 px-3 py-1.5 text-[12px] font-medium text-[#5B7BFE] ${
            chipPulse ? 'fcd-pulse' : ''
          } ${chipPressing ? 'fcd-chip-press' : ''}`}
        >
          <Zap size={13} strokeWidth={2} />
          <span>一键采纳全部高置信度</span>
          <span className="rounded-full bg-white px-1.5 py-px text-[10px] font-semibold tabular-nums">
            {highConfCount}
          </span>
        </div>
      )}

      {/* Category 列表 —— 1:1 复刻源码 253–420 行布局 */}
      <div className="space-y-2">
        <CategoryRow
          icon={CATEGORY_ICON.amount}
          label="金额"
          count={amountCount}
          expanded={amountExpanded}
        >
          {showAmountItems && (
            <ul className="border-t border-gray-100 divide-y divide-gray-100">
              {AMOUNT_ITEMS.map((it, i) => (
                <AmountItemRow
                  key={i}
                  item={it}
                  // 入场无动画（lightbox 开瞬间一同可见）；倒计时阶段按 80ms 错位 fade-out
                  exitDelay={T_COUNTDOWN_START / 1000 + i * 0.08}
                />
              ))}
            </ul>
          )}
        </CategoryRow>

        <CategoryRow icon={CATEGORY_ICON.date} label="日期" count={dateCount} expanded={false} />

        {!personGone && (
          <div style={{ opacity: personOpacity, transition: 'opacity 0.1s linear' }}>
            <CategoryRow icon={CATEGORY_ICON.person} label="人物" count={personCount} expanded={false} />
          </div>
        )}

        {!locationGone && (
          <div style={{ opacity: locationOpacity, transition: 'opacity 0.1s linear' }}>
            <CategoryRow icon={CATEGORY_ICON.location} label="地点" count={locationCount} expanded={false} />
          </div>
        )}

        <CategoryRow icon={CATEGORY_ICON.text} label="业务术语" count={textCount} expanded={false} />
      </div>

      {/* Replay 按钮（动画走完出现） */}
      {showReplay && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            replay();
          }}
          className="absolute -top-2 right-0 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 backdrop-blur transition-colors hover:border-[#5B7BFE]/50 hover:text-[#5B7BFE]"
          aria-label="重新播放事实澄清动画"
        >
          <RotateCcw size={11} strokeWidth={2} />
          重播
        </button>
      )}

      {/* Modal —— 模仿截图3 的 macOS 原生 confirm 视觉，文案 1:1 复刻源码第 142 行 */}
      {showModal && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          {/* 半透明 backdrop（贴在 demo 容器内）*/}
          <div
            className="absolute inset-0 rounded-lg bg-black/30"
            style={{
              animation: `${modalExiting ? 'fcdBackdropExit' : 'fcdBackdropEnter'} 0.2s ease both`,
              backdropFilter: 'blur(2px)',
            }}
          />
          {/* macOS 风格 dialog */}
          <div
            className="relative max-w-[340px] rounded-xl bg-white/95 px-5 py-5 shadow-[0_30px_60px_rgba(15,23,42,0.3)]"
            style={{
              animation: `${modalExiting ? 'fcdModalExit' : 'fcdModalEnter'} 0.25s cubic-bezier(0.16,1,0.3,1) both`,
            }}
          >
            <p className="text-[13px] text-gray-900 leading-relaxed mb-4 text-center">
              将批量采纳 72 条高置信度候选（剩余 9 条需要逐条审）？
            </p>
            <div className="flex gap-2.5">
              <div className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-center text-[12.5px] font-medium text-gray-700">
                Cancel
              </div>
              <div
                className={`flex-1 rounded-md bg-[#0A84FF] px-4 py-2 text-center text-[12.5px] font-semibold text-white ${
                  okPulse ? 'fcd-pulse' : ''
                }`}
              >
                OK
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryRowProps {
  icon: LucideIcon;
  label: string;
  count: number;
  expanded: boolean;
  children?: React.ReactNode;
}

// 单个分类行 —— 1:1 复刻源码第 262–294 行的 grouped header（含字号 px-4 py-2.5 / text-[13px] 等）
function CategoryRow({ icon: Icon, label, count, expanded, children }: CategoryRowProps): JSX.Element {
  return (
    <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
      <div className="flex items-stretch justify-between">
        <div className="flex flex-1 items-center gap-2.5 px-4 py-2.5 text-left">
          <span className="flex h-4 w-4 items-center justify-center text-gray-400">
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              {expanded ? (
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </span>
          <Icon size={14} className="text-gray-500" strokeWidth={1.8} />
          <span className="text-[13px] font-medium text-gray-800">{label}</span>
          <span className="tabular-nums text-[11px] text-gray-400">{count}</span>
        </div>
        <div className="border-l border-gray-100 px-3 flex items-center text-[11px] font-medium text-gray-500">
          全部采纳
        </div>
      </div>
      {children}
    </div>
  );
}

interface AmountItemRowProps {
  item: AmountItem;
  exitDelay: number;
}

// 单条事实卡 —— 1:1 复刻源码第 318–413 行（精简掉本地交互按钮的逻辑，仅保留视觉）
// 入场无动画（lightbox 打开瞬间和其它内容一同可见）；倒计时阶段按 exitDelay 错位 fade-out
function AmountItemRow({ item, exitDelay }: AmountItemRowProps): JSX.Element {
  const confTone =
    item.confidence >= 0.9
      ? 'text-emerald-700 border-emerald-200 bg-emerald-50/60'
      : item.confidence >= 0.7
        ? 'text-amber-700 border-amber-200 bg-amber-50/60'
        : 'text-gray-500 border-gray-200 bg-gray-50';
  return (
    <li
      className="px-4 py-3 overflow-hidden"
      style={{
        animation: `fcdItemOut 0.35s cubic-bezier(0.4,0,1,1) ${exitDelay}s forwards`,
        willChange: 'opacity, transform, max-height',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-gray-900 truncate">
              {item.term}
              <span className="mx-1 text-gray-300">·</span>
              <span className="text-gray-600">{item.attribute_name}</span>
            </span>
            <span className="rounded-full border border-gray-200 px-1.5 py-px text-[10px] font-medium text-gray-500">
              {item.source_label}
            </span>
            <span className={`rounded-full border px-1.5 py-px text-[10px] font-medium tabular-nums ${confTone}`}>
              {Math.round(item.confidence * 100)}%
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5 text-[13px] text-gray-700">
            <span className="text-gray-300">=</span>
            <span>{item.value_text}</span>
            {item.value_unit && <span className="text-[12px] text-gray-400">{item.value_unit}</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
            {item.scope && <span>口径：{item.scope}</span>}
            {item.source_evidence && (
              <>
                <span className="text-gray-200">·</span>
                <span>证据：{item.source_evidence}</span>
              </>
            )}
          </div>
        </div>
        {/* 三个操作按钮 —— 静态展示，不挂交互（这是 demo） */}
        <div className="flex shrink-0 items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            ✓ 采纳
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600">
            ⋯ 澄清
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500">
            × 拒绝
          </span>
        </div>
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// FactClarifyLightbox —— 外层悬浮窗，被 Features Card #01 点击触发
//
// 结构：
//   fixed inset-0 整屏
//   ├ backdrop: bg-black/45 + backdrop-filter blur(12px) saturate(140%) = 毛玻璃
//   └ 横屏白色面板: rounded-3xl + max-w-5xl，居中
//       ├ 右上角 X 关闭按钮
//       └ <FactClarifyDemo /> 内嵌
//
// 关闭三种方式：点遮罩 / 点 X / 按 ESC
// 打开时锁滚动（body overflow-hidden），关闭时恢复
// ──────────────────────────────────────────────────────────────────────────

const LIGHTBOX_CSS = `
@keyframes fclBackdropIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fclPanelIn {
  from { opacity: 0; transform: scale(0.96) translate3d(0, 8px, 0); }
  to   { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
}
`;

interface FactClarifyLightboxProps {
  open: boolean;
  onClose: () => void;
}

export function FactClarifyLightbox({ open, onClose }: FactClarifyLightboxProps): JSX.Element | null {
  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 打开时锁 body 滚动
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
      aria-label="事实澄清演示"
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10"
    >
      <style>{LIGHTBOX_CSS}</style>

      {/* 毛玻璃 backdrop —— 点击关闭 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
        style={{
          backdropFilter: 'blur(12px) saturate(140%)',
          WebkitBackdropFilter: 'blur(12px) saturate(140%)',
          animation: 'fclBackdropIn 0.25s ease both',
        }}
      />

      {/* 横屏白色面板 */}
      <div
        className="relative w-full max-w-[1040px] rounded-3xl bg-white shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)] overflow-hidden"
        style={{
          animation: 'fclPanelIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* 右上 X 关闭按钮 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200 transition-all hover:text-gray-700 hover:ring-gray-300 hover:scale-105"
        >
          <X size={16} strokeWidth={2} />
        </button>

        {/* 演示内容（事实澄清动画） */}
        <div className="px-8 py-10 sm:px-12 sm:py-12">
          <FactClarifyDemo />
        </div>
      </div>
    </div>,
    document.body,
  );
}
