// 场景2: 客户工作台 — 复刻 V2.0 软件"工作台 / 客户日慈基金会"页。
//
// 性质说明：
//   - 全部内容按截图2 重画（软件原件的聊天 + 文件面板嵌在 App.tsx 巨石里，无法直接 import）
//   - 文案：对照截图2 逐字转写（用户 prompt + AI 长文本回复 + 4 个文件名）
//   - 动效：
//       · 正文每个字符独立 <span>，通过 CSS animation-delay 形成横向波浪
//         （不是逐字渲染——所有字符从 t=0 就在 DOM 里，只是按 delay 揭示，
//          这样布局稳定不跳动，视觉上像"海浪沿水平方向推过来"）
//       · 关键帧：translate3d(0, 6px, -12px) scale(0.94) → (0,0,0) scale(1) +
//         opacity 0→1，cubic-bezier(0.16,1,0.3,1)（easeOutExpo，扑入感）
//       · 字符 stagger 7ms / 字符动画 450ms（约 5s 走完整个正文）
//       · 4 张文件卡用更明显的 3D 扑入：translate3d(0,18px,-50px) rotateX(8deg) scale(0.88)
//       · 全部动效遵守 prefers-reduced-motion
//
// Canvas: 1280 × 920。主区域 1060 × 920（去掉 sidebar）。
// 动效预算：
//   t=0      场景挂载（外层 fade-in-up 0.8s）
//   t=0.5s   字符波浪起步 + 文件卡 1
//   t=1.2/1.9/2.6s 文件卡 2/3/4
//   t=~5.5s  字符波浪走完
//   t=10s    切到下一场景（含 ~4s 静态阅读窗口）

import { useEffect, useState, type ReactNode } from 'react';
import {
  Upload,
  LayoutGrid,
  Leaf,
  Sparkles,
  Link2,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  Tag,
  FolderOpen,
  Search,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  PenTool,
} from 'lucide-react';
import { AppShell } from './AppShell';

interface FileRow {
  kind: 'xlsx' | 'docx';
  name: string;
}

const FILE_ROWS: FileRow[] = [
  { kind: 'xlsx', name: '20260526_153859_把你掌握的所有日慈基金会的信息帮我做成一张表格.xlsx' },
  { kind: 'docx', name: '20260525_215107_把你掌握的所有日慈基金会的信息帮我做成一张表格.docx' },
  { kind: 'docx', name: '日慈基金会_品牌分析_20260525-153730.docx' },
  { kind: 'docx', name: '日慈基金会_客户背景档案_(含组织介绍_+_项目清单)_20260525-153321.docx' },
];

const USER_PROMPT =
  '我要给广州民政写一段儿日慈基金会的介绍材料，大概在 2000 字左右。介绍日慈基金会的主要项目，解决的主要的问题，以及我们的项目设计逻辑、方法论，以及近几年项目创造的一些成果数据';

// ── AI 回复的结构化文档（按段落 + 加粗 run 切分） ──
interface TextRun {
  text: string;
  bold?: boolean;
}
type DocBlock =
  | { kind: 'h3'; runs: TextRun[] }
  | { kind: 'p'; runs: TextRun[] };

const AI_RESPONSE: DocBlock[] = [
  {
    kind: 'h3',
    runs: [
      { text: '日慈基金会专注青少年心理健康服务，具备成熟心智素养建设体系与实证落地成果' },
    ],
  },
  {
    kind: 'p',
    runs: [
      { text: '广东省日慈公益基金会于' },
      { text: '2013 年 12 月 31 日', bold: true },
      { text: '由广东省民政厅批准注册成立，注册地址位于广州市越秀区解放南路 123 号金汇大厦 18 楼 E034，是具备独立法人资格的地方性非公募基金会，2017 年正式认定为慈善组织。2024 年机构通过复审获得省级非营利组织免税资格，同时持续持有广东省级公益性社会组织捐赠税前扣除资格，历年年度工作报告、审计报告、管理制度均按监管要求在官方渠道公开披露，合规运营资质齐全。' },
    ],
  },
  {
    kind: 'p',
    runs: [
      { text: '机构自成立以来始终聚焦青少年儿童心理健康与幸福成长核心赛道，以积极心理学、社会情感学习（SEL）为核心理论基础，区别于传统聚焦个案干预的心理服务机构，核心定位为青少年心理健康前置教育供给方，通过普惠型课程、场景化活动、关键人群赋能等方式，从源头降低青少年心理问题累积风险，搭建由学校、家庭、社群共同参与的心理支持网络。' },
    ],
  },
  {
    kind: 'p',
    runs: [
      { text: '日慈所有业务均严格划定专业合规边界，不提供心理诊断、治疗类服务，仅开展前置型心理健康教育、心理韧性建设与同伴 / 社群支持类服务，所有项目设计均符合《精神卫生法》《未成年人保护法》相关监管要求。' },
    ],
  },
  {
    kind: 'p',
    runs: [
      { text: '目前机构已形成覆盖 6–24 岁全年龄段青少年的成熟项目矩阵，核心业务包括面向乡村中小学生的' },
      { text: '心灵魔法学院', bold: true },
      { text: '心理健康教育项目、面向 18–24 岁大学生群体的' },
      { text: '心盛计划', bold: true },
      { text: '同辈心理互助项目、面向一线授课教师的教师赋能项目三大板块。截至 2025 年，机构累计服务儿童超过' },
      { text: '90 万名', bold: true },
      { text: '、服务大学生近' },
      { text: '17 万', bold: true },
    ],
  },
];

// ── 动效参数 ──
const TEXT_START_DELAY_S = 0.5;
const TEXT_STAGGER_S = 0.007; // 7ms / 字符
const TEXT_CHAR_DURATION_S = 0.45;

const FILE_START_DELAY_S = 0.5;
const FILE_STAGGER_S = 0.7;
const FILE_CARD_DURATION_S = 0.7;

// 把结构化文档展平成 (字符 + 元数据) 列表，给每个字符分配全局索引（决定它的 animation-delay）
interface CharSpan {
  ch: string;
  bold: boolean;
  globalIdx: number;
}
interface BlockChars {
  kind: 'h3' | 'p';
  chars: CharSpan[];
}

function buildBlocks(doc: DocBlock[]): BlockChars[] {
  const result: BlockChars[] = [];
  let globalIdx = 0;
  for (const block of doc) {
    const chars: CharSpan[] = [];
    for (const run of block.runs) {
      for (const ch of run.text) {
        chars.push({ ch, bold: !!run.bold, globalIdx });
        globalIdx += 1;
      }
    }
    result.push({ kind: block.kind, chars });
  }
  return result;
}

const BLOCKS = buildBlocks(AI_RESPONSE);

// 一次性注入：字符波浪 + 文件卡 3D 扑入 keyframes
const SCENE_CSS = `
@keyframes wsCharRise {
  0% {
    opacity: 0;
    transform: translate3d(0, 6px, -12px) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
@keyframes wsCardPounce {
  0% {
    opacity: 0;
    transform: translate3d(0, 18px, -50px) rotateX(8deg) scale(0.88);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotateX(0) scale(1);
  }
}
.ws-char {
  display: inline-block;
  /* 防止 inline-block 之间残留可见间隙 */
  margin: 0;
  padding: 0;
  /* 中文允许任意字符处换行（inline-block 默认不会，得加这条） */
  word-break: break-all;
}
.ws-perspective {
  perspective: 800px;
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

function renderBlocks(blocks: BlockChars[], reduced: boolean): ReactNode {
  return blocks.map((block, blockIdx) => {
    const children = block.chars.map((c) => {
      const style: React.CSSProperties = reduced
        ? { fontWeight: c.bold ? 700 : undefined, color: c.bold ? '#0F172A' : undefined }
        : {
            animation: `wsCharRise ${TEXT_CHAR_DURATION_S}s cubic-bezier(0.16, 1, 0.3, 1) ${
              TEXT_START_DELAY_S + c.globalIdx * TEXT_STAGGER_S
            }s both`,
            fontWeight: c.bold ? 700 : undefined,
            color: c.bold ? '#0F172A' : undefined,
          };
      return (
        <span key={c.globalIdx} className="ws-char" style={style}>
          {c.ch}
        </span>
      );
    });
    if (block.kind === 'h3') {
      return (
        <h3 key={blockIdx} className="text-[#0F172A] font-bold mb-3" style={{ fontSize: 17, lineHeight: 1.45 }}>
          {children}
        </h3>
      );
    }
    return (
      <p key={blockIdx} className="mb-3">
        {children}
      </p>
    );
  });
}

function FileTypeIcon({ kind }: { kind: 'xlsx' | 'docx' }): JSX.Element {
  if (kind === 'xlsx') {
    return (
      <div className="flex items-center justify-center rounded-md shrink-0" style={{ width: 28, height: 28, background: '#ECFDF5' }}>
        <FileSpreadsheet size={16} color="#10B981" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center rounded-md shrink-0" style={{ width: 28, height: 28, background: '#EFF6FF' }}>
      <FileText size={16} color="#2563EB" />
    </div>
  );
}

// 底部输入框组件 —— 软件 V2.0 App.tsx 第 19526-19659 行 1:1 视觉移植
//   · rounded-[24px] 外壳 / 紫色 #5B7BFE 发送按钮 / 13×13 白方块停止图标 = 复用源码视觉常量
//   · 三个 chip（深度思考 / 完全客观 / 写作风格）= 按用户提供的截图重画，V2.0 源码 grep 零命中
function Composer(): JSX.Element {
  return (
    <div
      className="rounded-[20px] bg-white"
      style={{
        border: '1.5px solid #C7D2FE',
        boxShadow: '0 4px 20px rgba(91,123,254,0.05)',
      }}
    >
      {/* 上半：textarea placeholder 区 —— 文案保持软件原模板"让 ${model} 帮你推演 ${client} 的业务问题..." */}
      <div style={{ padding: '14px 16px 8px 16px' }}>
        <div style={{ color: '#94A3B8', fontSize: 13.5, lineHeight: 1.6, minHeight: 30 }}>
          让 GPT 5.4 帮你推演 新思考 的业务问题...
        </div>
      </div>

      {/* 下半：三个 chip 切换 + 停止按钮 */}
      <div className="flex items-center justify-between" style={{ padding: '0 10px 10px 12px' }}>
        <div className="flex items-center gap-1.5">
          {/* 深度思考 — 带开启状态 toggle */}
          <div
            className="flex items-center gap-1.5 rounded-full"
            style={{
              padding: '5px 10px 5px 8px',
              background: '#fff',
              border: '1px solid #E5E7EB',
              fontSize: 12,
            }}
          >
            <Sparkles size={13} color="#7C3AED" />
            <span className="font-medium text-[#475569]">深度思考</span>
            <span
              className="relative inline-block"
              style={{
                width: 22,
                height: 12,
                borderRadius: 6,
                background: '#5B7BFE',
                marginLeft: 2,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
                }}
              />
            </span>
          </div>

          {/* 完全客观 — 带下拉 chevron */}
          <div
            className="flex items-center gap-1.5 rounded-full"
            style={{
              padding: '5px 10px',
              background: '#fff',
              border: '1px solid #E5E7EB',
              fontSize: 12,
            }}
          >
            <ShieldCheck size={13} color="#64748B" />
            <span className="font-medium text-[#475569]">完全客观</span>
            <ChevronDown size={11} color="#94A3B8" />
          </div>

          {/* 写作风格 */}
          <div
            className="flex items-center gap-1.5 rounded-full"
            style={{
              padding: '5px 10px',
              background: '#fff',
              border: '1px solid #E5E7EB',
              fontSize: 12,
            }}
          >
            <PenTool size={13} color="#64748B" />
            <span className="font-medium text-[#475569]">写作风格</span>
          </div>
        </div>

        {/* 停止按钮 —— 软件原件用 ArrowUp 发送 / 13×13 白方块停止 (composerBusyMode)，
            截图状态为"AI 正在回答"所以渲染停止态 */}
        <button
          type="button"
          className="rounded-xl"
          style={{
            padding: 8,
            background: '#5B7BFE',
            boxShadow: '0 4px 12px rgba(91,123,254,0.3)',
            border: 'none',
            cursor: 'default',
          }}
          aria-label="停止当前回答"
        >
          <span
            className="block"
            style={{ width: 13, height: 13, borderRadius: 3, background: '#fff' }}
          />
        </button>
      </div>
    </div>
  );
}

function FileRowCard({ row }: { row: FileRow }): JSX.Element {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white" style={{ padding: 12 }}>
      <div className="flex items-start gap-3 mb-2.5">
        <FileTypeIcon kind={row.kind} />
        <div className="flex-1 min-w-0">
          <div className="text-[#0F172A] font-semibold leading-snug" style={{ fontSize: 13 }}>
            {row.name}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[#94A3B8]" style={{ paddingLeft: 40 }}>
        <ChevronLeft size={14} />
        <ExternalLink size={14} />
        <Tag size={14} />
        <FolderOpen size={14} />
        <Trash2 size={14} />
      </div>
    </div>
  );
}

function WorkspaceMain(): JSX.Element {
  const reduced = useReducedMotion();

  return (
    <div className="h-full flex flex-col">
      <style>{SCENE_CSS}</style>

      {/* 顶部 header */}
      <header className="flex items-center justify-between border-b border-[#F1F5F9] bg-white" style={{ padding: '18px 28px 14px' }}>
        <div>
          <div className="text-[#94A3B8] font-bold tracking-[2px]" style={{ fontSize: 11 }}>
            WORKSPACE
          </div>
          <div className="text-[#0F172A] font-semibold tracking-tight mt-0.5" style={{ fontSize: 22 }}>
            日慈基金会
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full" style={{ padding: '6px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[#047857] font-bold tracking-wider" style={{ fontSize: 12 }}>DNA</span>
        </div>
      </header>

      {/* 主体：左聊天 + 右文件面板 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左：聊天区 + 底部输入框 */}
        <section className="relative flex flex-col overflow-hidden" style={{ width: 690 }}>
          {/* 聊天滚动区（底部留出 composer 高度的 padding） */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ padding: '22px 28px 14px 32px' }}>
            {/* 用户气泡 */}
            <div className="self-end max-w-[88%] mb-5">
              <div
                className="rounded-2xl text-white"
                style={{
                  padding: '14px 18px',
                  background: 'linear-gradient(135deg,#3A4FB5 0%,#5B70D8 100%)',
                  fontSize: 13.5,
                  lineHeight: 1.65,
                }}
              >
                {USER_PROMPT}
              </div>
            </div>

            {/* AI 回复 meta */}
            <div className="flex items-center justify-between mb-3 text-[#94A3B8]" style={{ fontSize: 11.5 }}>
              <span className="font-medium">AI · 豆包火山方舟 · 耗时 348.4 秒</span>
              <Trash2 size={13} />
            </div>

            {/* AI 回复正文（字符波浪） */}
            <article className="overflow-hidden text-[#1E293B] flex-1" style={{ fontSize: 13.5, lineHeight: 1.85 }}>
              {renderBlocks(BLOCKS, reduced)}
            </article>
          </div>

          {/* 底部输入框 composer —— 软件 App.tsx 第 19526-19659 行 1:1 视觉移植；
              三个 chip 按截图重画（V2.0 源码 grep 零命中） */}
          <div className="shrink-0" style={{ padding: '0 28px 18px 32px' }}>
            <Composer />
          </div>
        </section>

        {/* 右：文件面板 */}
        <aside className="border-l border-[#F1F5F9] bg-[#FAFBFC] flex flex-col overflow-hidden" style={{ width: 370 }}>
          {/* 快捷工具 */}
          <div style={{ padding: '20px 22px 16px' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#0F172A] font-semibold" style={{ fontSize: 13 }}>快捷工具</span>
              <span className="text-[#3A4FB5] font-medium" style={{ fontSize: 11.5 }}>打开工具页</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[Upload, LayoutGrid, Leaf, Sparkles, Link2].map((Icon, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center rounded-xl bg-white border border-[#E5E7EB]"
                  style={{ height: 46 }}
                >
                  <Icon size={18} color="#64748B" />
                </div>
              ))}
            </div>
          </div>

          {/* 统计行 */}
          <div className="flex items-center justify-between text-[#64748B] border-y border-[#F1F5F9]" style={{ padding: '12px 22px', fontSize: 11.5 }}>
            <span className="font-medium">247 份文件</span>
            <span className="flex items-center gap-1.5">
              <span>OCR 识别率 94.2%</span>
              <RefreshCw size={11} />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>待澄清 73</span>
            </span>
          </div>

          {/* tabs */}
          <div className="flex items-center gap-5 border-b border-[#F1F5F9] text-[#64748B]" style={{ padding: '12px 22px', fontSize: 13 }}>
            <span className="flex items-center gap-1 text-[#0F172A] font-bold border-b-2 border-[#3A4FB5]" style={{ paddingBottom: 6 }}>
              <FolderOpen size={14} />
              <span>文件</span>
            </span>
            <span className="flex items-center gap-1">
              <span>收藏</span>
            </span>
            <span className="flex items-center gap-1">
              <span>工具</span>
            </span>
          </div>

          {/* 搜索行 */}
          <div className="flex items-center gap-2" style={{ padding: '12px 22px' }}>
            <div className="flex-1 flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white" style={{ padding: '7px 12px', fontSize: 12 }}>
              <Search size={13} color="#94A3B8" />
              <span className="text-[#94A3B8]">写一句话告诉 AI 你想找</span>
            </div>
            <div className="rounded-full border border-[#E5E7EB] bg-white text-[#0F172A] font-medium" style={{ padding: '7px 14px', fontSize: 12 }}>
              AI 搜
            </div>
          </div>

          {/* 文件卡列表（3D 扑入，错位 0.7s 间隔） */}
          <div className="flex-1 overflow-hidden flex flex-col gap-2 ws-perspective" style={{ padding: '4px 22px 22px' }}>
            {FILE_ROWS.map((row, i) => (
              <div
                key={i}
                style={
                  reduced
                    ? undefined
                    : {
                        animation: `wsCardPounce ${FILE_CARD_DURATION_S}s cubic-bezier(0.16, 1, 0.3, 1) ${
                          FILE_START_DELAY_S + i * FILE_STAGGER_S
                        }s both`,
                        transformStyle: 'preserve-3d',
                      }
                }
              >
                <FileRowCard row={row} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function WorkspaceScene(): JSX.Element {
  return (
    <AppShell activeNav="workspace">
      <WorkspaceMain />
    </AppShell>
  );
}
