// SmartEditDemo + SmartEditLightbox — Features Card #02 的点击弹横屏悬浮窗演示。
//
// 整体流：
//   1) 看到客户工作台的智能编辑页面，最后一段被选中（蓝底）
//   2) 选区"右键"出 AI 生成 popover
//   3) 右侧文件卡的"← 引入"图标 pulse + 按下
//   4) 文件 chip 滑入 popover body
//   5) prompt 打字机出现："根据了解的善加基金会以及这个文件里的内容..."
//   6) 点击"执行"，popover 进入"处理中"
//   7) 2 秒后 popover 消失，原选中段落淡出
//   8) 新内容渐入替换原内容
//
// 性质说明：
//   - AI 生成 popover 视觉/类名 = ⭐ 1:1 复刻 V2.1 主仓
//     src/renderer/components/client_workspace/RichTextDocumentEditor.tsx
//     （第 736–890 行：rounded-xl border bg-white shadow + header gradient + body chip+textarea +
//      footer 创意模式/写作风格/执行按钮 全套）
//   - 客户工作台顶 bar、工具栏、文档内容 = 按截图重画
//   - 文档内容、文件名、prompt、替换后内容 = 全部按用户提供截图逐字转写
//   - 全 GPU 路径：opacity + transform + scaleX/Y
//   - 全部遵守 prefers-reduced-motion

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Bold,
  ChevronLeft,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FolderOpen,
  Italic,
  LayoutGrid,
  Leaf,
  Link2,
  Loader2,
  Play,
  Redo,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Strikethrough,
  Subscript,
  Superscript,
  Tag,
  Trash2,
  Underline,
  Undo,
  Upload,
  X,
} from 'lucide-react';

interface FileRow {
  kind: 'docx' | 'xlsx' | 'pdf';
  name: string;
}

// 右侧文件面板 4 条 —— 按截图1转写
const FILE_ROWS: FileRow[] = [
  { kind: 'docx', name: '善加基金会尽调评估报告.docx' },
  { kind: 'docx', name: '05-13_善加基金会接续决策会_会议纪要.docx' },
  { kind: 'docx', name: '20260517_054516_详细的介绍善加基金会 等 6 段对话.docx' },
  { kind: 'pdf', name: '2023.pdf' },
];

// AI prompt —— 按截图4 转写
const AI_PROMPT =
  '根据了解的善加基金会以及这个文件里的内容，用 300 字重新介绍善加基金会的核心业务';

// 替换后新内容 —— 按截图5 转写
const REPLACEMENT_PARAGRAPHS: { kind: 'bold' | 'bullet'; text: string }[] = [
  {
    kind: 'bold',
    text:
      '善加基金会的核心业务围绕"困境家庭的可持续支持"展开，不是单次发钱、发物资，而是希望通过能力赋能、资源对接和持续陪伴，帮助困境家庭逐步恢复自身的发展能力。',
  },
  {
    kind: 'bullet',
    text:
      '就业赋能板块以"益点爱·妈妈岗再就业项目"和"社区微托育员特训营"为代表，主要服务特殊儿童家庭妈妈、因病致贫家庭妈妈、失业无收入困境妈妈。项目通过技能培训、心理支持和岗位对接，帮助妈妈们在照顾家庭的同时重新获得收入来源。',
  },
  {
    kind: 'bullet',
    text:
      '医疗救助板块以"缘救宝贝"为核心，面向全国困境大病儿童及其家庭提供医疗相关支持。项目不仅关注治疗费用，也关注医疗资源对接、就医陪伴和家庭压力缓解，减少困境家庭因疾病陷入更深困境的风险。',
  },
  {
    kind: 'bullet',
    text:
      '文化公益板块以"天蓝彼岸艺术节"为代表，由善加基金会与深圳市天使家园特殊儿童关爱中心协同推进。项目通过艺术展示、公众参与和社会融合活动，让特殊儿童及其家庭被看见、被理解，也为他们打开更多社会连接的可能。',
  },
];

// 关键帧
const SED_CSS = `
@keyframes sedPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(91, 123, 254, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(91, 123, 254, 0); }
}
.sed-pulse { animation: sedPulse 0.9s ease-in-out infinite; }
@keyframes sedPress {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.88); }
  100% { transform: scale(1); }
}
.sed-press { animation: sedPress 0.3s cubic-bezier(0.4, 0, 0.6, 1); }
@keyframes sedPopoverIn {
  0%   { opacity: 0; transform: scale(0.94) translate3d(0, 6px, 0); }
  100% { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
}
@keyframes sedPopoverOut {
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.96); }
}
@keyframes sedFileChipIn {
  0%   { opacity: 0; transform: translate3d(80px, 0, 0); }
  100% { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes sedSelectionSweep {
  0%   { clip-path: inset(0 0 100% 0); }
  100% { clip-path: inset(0 0 0 0); }
}
@keyframes sedSelectionRipple {
  0%   { opacity: 0.6; box-shadow: 0 0 0 0 rgba(91, 123, 254, 0.35); }
  100% { opacity: 0; box-shadow: 0 0 0 16px rgba(91, 123, 254, 0); }
}
@keyframes sedFadeOut {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes sedFadeIn {
  0%   { opacity: 0; transform: translate3d(0, 4px, 0); }
  100% { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes sedCursorBlink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
.sed-cursor {
  display: inline-block;
  width: 1px;
  height: 1em;
  background: currentColor;
  vertical-align: -2px;
  margin-left: 1px;
  animation: sedCursorBlink 0.8s step-end infinite;
}
@keyframes sedStepIn {
  0%   { opacity: 0; transform: translate3d(0, 4px, 0); }
  100% { opacity: 1; transform: translate3d(0, 0, 0); }
}
.sed-step-in { animation: sedStepIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
`;

// 6 步导航关键词 —— 帮助第一次看的人理解每一步在干什么
// 时间窗整体放慢 1.5 倍，让小白用户能跟得上
const STEPS: { id: number; text: string; from: number; to: number }[] = [
  { id: 1, text: '框选要修改的文字', from: 0, to: 2250 },
  { id: 2, text: '右键唤出 AI 弹窗', from: 2250, to: 3750 },
  { id: 3, text: '引入参考文件', from: 3750, to: 5550 },
  { id: 4, text: '输入指令', from: 5550, to: 8550 },
  { id: 5, text: '点击执行', from: 8550, to: 12150 },
  { id: 6, text: '内容自动生成', from: 12150, to: 99999 },
];

// 时间节点（毫秒）—— 整体放慢 1.5 倍
// 拖选过程：500ms 起步，1800ms 落定（之后是 0.45s settle + 右键 ripple）
const T_SELECTION_SWEEP_START = 500;
const T_SELECTION_SWEEP_END = 1800;
const T_SELECTION_RIPPLE = 2250;
const T_POPOVER_IN_START = 2550;
const T_POPOVER_IN_END = 3075;
const T_FILE_CHEVRON_PULSE_START = 3750;
const T_FILE_CHEVRON_PULSE_END = 4500;
const T_FILE_CHEVRON_PRESS = 4500;
const T_FILE_CHIP_IN_START = 4650;
const T_PROMPT_TYPE_START = 5550;
const T_PROMPT_TYPE_END = 8250;
const T_EXECUTE_PULSE_START = 8550;
const T_EXECUTE_PULSE_END = 9150;
const T_EXECUTE_PRESS = 9150;
const T_PROCESSING_START = 9150;
const T_PROCESSING_END = 12150;
const T_POPOVER_OUT_START = 12150;
const T_POPOVER_OUT_END = 12600;
const T_OLD_FADE_START = 12600;
const T_NEW_FADE_START = 13500;
const T_FINAL = 15750;
const T_LOOP_LIMIT = 16500;

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

function FileTypeIcon({ kind }: { kind: FileRow['kind'] }): JSX.Element {
  if (kind === 'xlsx') {
    return (
      <div className="flex items-center justify-center rounded-md shrink-0" style={{ width: 26, height: 26, background: '#ECFDF5' }}>
        <FileSpreadsheet size={14} color="#10B981" />
      </div>
    );
  }
  if (kind === 'pdf') {
    return (
      <div className="flex items-center justify-center rounded-md shrink-0" style={{ width: 26, height: 26, background: '#FEF2F2' }}>
        <FileText size={14} color="#DC2626" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center rounded-md shrink-0" style={{ width: 26, height: 26, background: '#EFF6FF' }}>
      <FileText size={14} color="#2563EB" />
    </div>
  );
}

export function SmartEditDemo(): JSX.Element {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!active) return;
    if (reduced) {
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

  // 派生
  const showSelectionRipple = !reduced && elapsed >= T_SELECTION_RIPPLE && elapsed < T_SELECTION_RIPPLE + 700;
  const popoverVisible = elapsed >= T_POPOVER_IN_START && elapsed < T_POPOVER_OUT_END;
  const popoverEntering = elapsed >= T_POPOVER_IN_START && elapsed < T_POPOVER_IN_END;
  const popoverExiting = elapsed >= T_POPOVER_OUT_START;
  const fileChipShown = elapsed >= T_FILE_CHIP_IN_START;
  const fileChevronPulsing = !reduced && elapsed >= T_FILE_CHEVRON_PULSE_START && elapsed < T_FILE_CHEVRON_PULSE_END;
  const fileChevronPressing = !reduced && elapsed >= T_FILE_CHEVRON_PRESS && elapsed < T_FILE_CHEVRON_PRESS + 300;
  const executePulsing = !reduced && elapsed >= T_EXECUTE_PULSE_START && elapsed < T_EXECUTE_PULSE_END;
  const executePressing = !reduced && elapsed >= T_EXECUTE_PRESS && elapsed < T_EXECUTE_PRESS + 300;
  const isProcessing = elapsed >= T_PROCESSING_START && elapsed < T_PROCESSING_END;
  const oldFadingOut = elapsed >= T_OLD_FADE_START;
  const showNewContent = elapsed >= T_NEW_FADE_START;
  const showReplay = elapsed >= T_FINAL;

  // 当前步骤（导航条）
  const activeStep =
    STEPS.find((s) => elapsed >= s.from && elapsed < s.to) ?? STEPS[STEPS.length - 1];

  // 打字机
  const promptProgress =
    elapsed <= T_PROMPT_TYPE_START
      ? 0
      : elapsed >= T_PROMPT_TYPE_END
        ? 1
        : (elapsed - T_PROMPT_TYPE_START) / (T_PROMPT_TYPE_END - T_PROMPT_TYPE_START);
  const promptShownChars = Math.floor(AI_PROMPT.length * promptProgress);
  const promptShownText = AI_PROMPT.slice(0, promptShownChars);
  const promptTyping = promptProgress > 0 && promptProgress < 1;

  return (
    <div ref={ref} className="relative">
      <style>{SED_CSS}</style>

      {/* ─── 6 步导航条 (tutorial banner) ─── */}
      <div
        className="flex items-center justify-between rounded-lg border border-[#5B7BFE]/20 bg-[#EEF3FF] px-3 py-2 mb-4"
        aria-live="polite"
      >
        <div key={activeStep.id} className="sed-step-in flex items-center gap-2.5 min-w-0">
          <span
            className="inline-flex items-center justify-center rounded-full bg-[#5B7BFE] text-white font-bold tabular-nums shrink-0"
            style={{ width: 20, height: 20, fontSize: 11 }}
          >
            {activeStep.id}
          </span>
          <span className="text-[12.5px] font-semibold text-[#1E3A8A] truncate">
            {activeStep.text}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {STEPS.map((s) => {
            const isActive = s.id === activeStep.id;
            const isPast = s.id < activeStep.id;
            return (
              <span
                key={s.id}
                className="rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 16 : 6,
                  height: 6,
                  background: isActive
                    ? '#5B7BFE'
                    : isPast
                      ? 'rgba(91,123,254,0.45)'
                      : 'rgba(91,123,254,0.18)',
                }}
              />
            );
          })}
          <span className="ml-2 text-[10.5px] font-medium text-[#5B7BFE] tabular-nums">
            {activeStep.id} / 6
          </span>
        </div>
      </div>

      {/* 顶 bar */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-4 min-w-0">
          <span className="inline-flex items-center gap-1 text-[12px] text-gray-500">
            <ArrowLeft size={13} />
            返回工作台
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold tracking-[1.4px] text-gray-400">DOCUMENT</span>
            <span className="text-[12.5px] text-gray-700 truncate">未命名文档（保存时自动从首段提取）</span>
          </div>
        </div>
        <span className="rounded-lg bg-[#5B7BFE] px-3 py-1.5 text-[11.5px] font-medium text-white">
          保存到项目文档库
        </span>
      </div>

      {/* 工具栏 tabs */}
      <div className="flex items-center gap-6 mb-2 text-[12px] border-b border-gray-100">
        <span className="text-[#5B7BFE] font-medium border-b-2 border-[#5B7BFE] pb-1.5 -mb-px">开始</span>
        <span className="text-gray-500 pb-1.5">插入</span>
        <span className="text-gray-500 pb-1.5">AI 助手</span>
        <span className="text-gray-500 pb-1.5">文档</span>
        <span className="text-gray-500 pb-1.5">样式</span>
        <span className="flex-1" />
        <div className="flex items-center gap-1.5 pb-1.5">
          <Undo size={13} className="text-gray-400" />
          <Redo size={13} className="text-gray-400" />
        </div>
      </div>

      {/* 字体 + 格式工具行 */}
      <div className="flex items-center gap-3 mb-4 text-gray-500 pt-1">
        <div className="flex items-center gap-1.5 pr-3 border-r border-gray-100">
          <Undo size={12} />
          <Redo size={12} />
        </div>
        <div className="flex items-center gap-2 pr-3 border-r border-gray-100">
          <Bold size={12} />
          <Italic size={12} />
          <Underline size={12} />
          <Strikethrough size={12} />
          <Superscript size={12} />
          <Subscript size={12} />
        </div>
        <div className="flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5">
          <span className="text-gray-400 text-[10.5px]">T</span>
          <span className="text-[10.5px] text-gray-700">正文</span>
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* 左 文档 / 右 文件 */}
      <div className="flex gap-5">
        {/* 文档区 */}
        <article
          className="flex-1 min-w-0 relative"
          style={{ fontSize: 11.5, lineHeight: 1.85, color: '#1E293B' }}
        >
          <h1 className="text-[18px] font-bold leading-snug mb-3 text-gray-900">
            善加基金会的核心不是单次救助，而是造血式长期帮扶体系
          </h1>

          <p className="mb-2.5">
            善加基金会是 <strong>2014 年</strong>在深圳市民政局登记注册的非公募基金会，前身为深圳市慈缘慈善基金会，
            <strong>2023 年 8 月 8 日</strong>经深圳市民政局批准变更名称为深圳市善加公益基金会，统一社会信用代码为
            <strong> 53440300305837768J</strong>，法定代表人为刘淑琴。机构公开资料同时显示，善加基金会获得社会组织评价
            <strong> 3A 级认证</strong>，并设有公益性捐赠税前扣除资格专项信息审核内容。
          </p>

          <p className="mb-2.5">
            更关键的是，善加基金会公开表达的机构使命与项目设计，指向的不是一次性发钱、发物资式救助，而是
            <strong>"助人自助"</strong>和"持续赋能"的长期帮扶逻辑。
          </p>

          <p className="mb-2.5">
            这一定位在机构自述中表达得很明确：其业务范围涵盖扶贫济困、资助儿童医疗与教育事业，服务对象不仅包括困境患病儿童，也包括困境家庭母亲、老人等特殊弱势群体；机构使命是
            <strong>"推动多层次社会创新，助弱势群体持续赋能"</strong>，愿景是"让人人拥有获得美好生活的能力"。与之对应，已形成的顾问判断也高度一致，即善加基金会项目设计围绕
            <strong>"能力赋能 + 资源对接 + 落地支撑"</strong>展开。
          </p>

          {/* 选中段落 / 新内容 */}
          <div className="relative">
            {!showNewContent && (
              <div
                className="relative rounded-md p-2 -mx-2"
                style={{
                  animation: oldFadingOut ? 'sedFadeOut 0.6s cubic-bezier(0.4, 0, 1, 1) forwards' : undefined,
                  willChange: 'opacity',
                }}
              >
                {/* 蓝底（拖选高亮层）—— 从 top→bottom 用 clip-path 扫出来 */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-md"
                  style={{
                    background: 'rgba(91,123,254,0.18)',
                    clipPath: 'inset(0 0 100% 0)',
                    animation: reduced
                      ? undefined
                      : `sedSelectionSweep ${(T_SELECTION_SWEEP_END - T_SELECTION_SWEEP_START) / 1000}s cubic-bezier(0.45, 0, 0.55, 1) ${T_SELECTION_SWEEP_START / 1000}s both`,
                    willChange: 'clip-path',
                  }}
                />

                {/* 文字内容 —— 一直可见，浮在蓝底之上 */}
                <div className="relative">
                  <p className="mb-2" style={{ color: '#1E293B' }}>
                    这一帮扶逻辑已经落到三类具体业务板块中，而不是停留在机构口号层面：
                  </p>
                  <ul className="space-y-1.5 list-disc list-outside ml-5">
                    <li>
                      <strong>就业赋能板块</strong>：以
                      <span className="underline decoration-dotted">益点爱·妈妈岗再就业项目</span>
                      和后续的社区微托育员特训营为代表，服务特殊儿童家庭妈妈、因病致贫家庭妈妈、失业无收入困境妈妈。
                    </li>
                    <li>
                      <strong>医疗救助板块</strong>：以
                      <span className="underline decoration-dotted">缘救宝贝</span>
                      为核心，面向困境大病儿童提供医疗相关支持，<strong>2023 年 1 月 1 日</strong>启动，服务地区为全国，服务领域为医疗卫生。
                    </li>
                    <li>
                      <strong>文化公益板块</strong>：以
                      <span className="underline decoration-dotted">天蓝彼岸艺术节</span>
                      为代表，项目自 <strong>2023 年</strong>启动，<strong>2026 年</strong>已举办第三届，并由善加基金会与深圳市天使家园特殊儿童关爱中心通过项目服务协议协同推进。
                    </li>
                  </ul>
                </div>

                {showSelectionRipple && (
                  <span
                    aria-hidden="true"
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      top: '40%',
                      left: '30%',
                      width: 6,
                      height: 6,
                      background: 'rgba(91,123,254,0.5)',
                      animation: 'sedSelectionRipple 0.7s ease-out forwards',
                    }}
                  />
                )}
              </div>
            )}

            {showNewContent && (
              <div
                className="rounded-md p-2 -mx-2"
                style={{
                  animation: 'sedFadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  willChange: 'opacity, transform',
                }}
              >
                {REPLACEMENT_PARAGRAPHS.map((para, i) => {
                  if (para.kind === 'bold') {
                    return (
                      <p key={i} className="mb-2.5" style={{ fontWeight: 600, color: '#0F172A' }}>
                        {para.text}
                      </p>
                    );
                  }
                  return (
                    <p key={i} className="mb-2 ml-5" style={{ position: 'relative' }}>
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: -14,
                          top: 8,
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: '#0F172A',
                        }}
                      />
                      {para.text}
                    </p>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI 生成 popover —— 1:1 复刻源码 736-890 行 */}
          {popoverVisible && (
            <div
              className="absolute z-20 rounded-xl border border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden"
              style={{
                top: showNewContent ? 0 : 30,
                right: -20,
                width: 340,
                animation: popoverExiting
                  ? 'sedPopoverOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards'
                  : popoverEntering
                    ? 'sedPopoverIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both'
                    : undefined,
                transformOrigin: 'top right',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-white px-3 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Sparkles size={12} className="shrink-0 text-[#5B7BFE]" />
                  <span className="shrink-0 text-[11.5px] font-bold text-[#5B7BFE]">AI 生成</span>
                  <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-px text-[10px] font-medium text-[#5B7BFE]">
                    选区 245 字
                  </span>
                </div>
                <span className="rounded p-0.5 text-gray-400">
                  <X size={14} />
                </span>
              </div>

              {/* Body */}
              <div className="px-3 py-2">
                {fileChipShown && (
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-700"
                      style={{
                        animation: 'sedFileChipIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                        willChange: 'opacity, transform',
                      }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8l-8.57 8.57a2 2 0 1 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span className="max-w-[180px] truncate">{FILE_ROWS[0].name}</span>
                      <X size={9} />
                    </span>
                  </div>
                )}
                <div
                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[11.5px] leading-5 text-gray-800"
                  style={{ minHeight: 50 }}
                >
                  {promptShownText.length > 0 ? (
                    <>
                      {promptShownText}
                      {promptTyping && <span className="sed-cursor" />}
                    </>
                  ) : (
                    <span className="text-gray-400">告诉 AI 怎么改这段…</span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-1.5 border-t border-gray-100 bg-gray-50/60 px-2.5 py-1.5">
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-[10.5px] font-medium text-[#5B7BFE]">客观</span>
                  <div className="flex items-center gap-0.5">
                    <span className="rounded p-1 bg-[#5B7BFE]/10 text-[#5B7BFE]">
                      <ShieldCheck size={12} />
                    </span>
                    <span className="rounded p-1 text-gray-400">
                      <Scale size={12} />
                    </span>
                    <span className="rounded p-1 text-gray-400">
                      <Sparkles size={12} />
                    </span>
                  </div>
                </div>
                <span className="w-[82px] shrink-0 truncate rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10.5px] text-gray-600">
                  默认风格 ▾
                </span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md bg-[#5B7BFE] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm ${
                    executePulsing ? 'sed-pulse' : ''
                  } ${executePressing ? 'sed-press' : ''}`}
                  style={{
                    opacity: !isProcessing && promptProgress < 1 ? 0.5 : 1,
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      处理中
                    </>
                  ) : (
                    <>
                      <Play size={11} />
                      执行
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </article>

        {/* 右文件面板 */}
        <aside className="shrink-0 flex flex-col" style={{ width: 220 }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#0F172A] font-semibold text-[12px]">快捷工具</span>
            <span className="text-[#5B7BFE] font-medium text-[10px]">打开工具页</span>
          </div>
          <div className="grid grid-cols-5 gap-1 mb-2.5">
            {[Upload, LayoutGrid, Leaf, Sparkles, Link2].map((Icon, i) => (
              <div
                key={i}
                className="flex items-center justify-center rounded-lg bg-white border border-gray-200"
                style={{ height: 32 }}
              >
                <Icon size={14} color="#64748B" strokeWidth={1.8} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-y border-gray-100 text-gray-500 text-[10px] py-1.5 mb-2">
            <span className="font-medium">51 份文件</span>
            <span className="flex items-center gap-1">
              <span>OCR 93.3%</span>
              <RefreshCw size={9} />
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>待澄清 9</span>
            </span>
          </div>

          <div className="flex items-center gap-3 border-b border-gray-100 text-gray-500 text-[11px] mb-2 pb-1.5">
            <span className="flex items-center gap-1 text-[#0F172A] font-bold border-b-2 border-[#5B7BFE] -mb-2 pb-1.5">
              <FolderOpen size={11} />
              <span>文件</span>
            </span>
            <span>收藏</span>
            <span>工具</span>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex-1 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px]">
              <Search size={9} color="#94A3B8" />
              <span className="text-gray-400">写一句话告诉 AI 你想找</span>
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-700">AI 搜</div>
          </div>

          <div className="flex flex-col gap-1.5">
            {FILE_ROWS.map((row, i) => {
              const isFirst = i === 0;
              return (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-2">
                  <div className="flex items-start gap-2 mb-1.5">
                    <FileTypeIcon kind={row.kind} />
                    <div className="text-[10.5px] font-semibold text-gray-900 leading-snug flex-1 min-w-0">
                      {row.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" style={{ paddingLeft: 34 }}>
                    <span
                      className={`inline-flex items-center justify-center rounded ${
                        isFirst && fileChevronPulsing ? 'sed-pulse text-[#5B7BFE]' : 'text-gray-400'
                      } ${isFirst && fileChevronPressing ? 'sed-press text-[#5B7BFE]' : ''}`}
                      style={{
                        width: 16,
                        height: 16,
                        background:
                          isFirst && (fileChevronPulsing || fileChevronPressing) ? 'rgba(91,123,254,0.12)' : 'transparent',
                        borderRadius: 4,
                      }}
                    >
                      <ChevronLeft size={11} />
                    </span>
                    <ExternalLink size={11} className="text-gray-400" />
                    <Tag size={11} className="text-gray-400" />
                    <FolderOpen size={11} className="text-gray-400" />
                    <Trash2 size={11} className="text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {showReplay && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            replay();
          }}
          className="absolute -top-2 right-0 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 backdrop-blur transition-colors hover:border-[#5B7BFE]/50 hover:text-[#5B7BFE]"
          aria-label="重新播放智能编辑演示"
        >
          <RotateCcw size={11} strokeWidth={2} />
          重播
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SmartEditLightbox —— 外层悬浮窗
// ──────────────────────────────────────────────────────────────────────────

const SED_LIGHTBOX_CSS = `
@keyframes selBackdropIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes selPanelIn {
  from { opacity: 0; transform: scale(0.96) translate3d(0, 8px, 0); }
  to   { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
}
`;

interface SmartEditLightboxProps {
  open: boolean;
  onClose: () => void;
}

export function SmartEditLightbox({ open, onClose }: SmartEditLightboxProps): JSX.Element | null {
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
      aria-label="客户工作台智能编辑演示"
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10"
    >
      <style>{SED_LIGHTBOX_CSS}</style>

      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
        style={{
          backdropFilter: 'blur(12px) saturate(140%)',
          WebkitBackdropFilter: 'blur(12px) saturate(140%)',
          animation: 'selBackdropIn 0.25s ease both',
        }}
      />

      <div
        className="relative w-full max-w-[1100px] rounded-3xl bg-white shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)] overflow-hidden"
        style={{
          animation: 'selPanelIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200 transition-all hover:text-gray-700 hover:ring-gray-300 hover:scale-105"
        >
          <X size={16} strokeWidth={2} />
        </button>

        <div className="px-7 py-8 sm:px-10 sm:py-10">
          <SmartEditDemo />
        </div>
      </div>
    </div>,
    document.body,
  );
}
