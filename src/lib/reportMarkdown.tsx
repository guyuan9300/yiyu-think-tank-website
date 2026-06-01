import type { ReactNode } from 'react';

// ============================================================
// 轻量 Markdown 引擎 (零依赖) · 报告详情页专用
// ------------------------------------------------------------
// 支持: YAML frontmatter / 标题(#~####) / 段落 / 有序·无序列表 /
//       GFM 表格 / 引用块 / 分隔线 / 行内 **粗体** `代码` [链接](url)。
// 用途: ① 提取目录(TOC) ② 提取简介 ③ 渲染正文 ④ 给 AI 当上下文。
// 报告内容是离线大模型生成的 Markdown, 这里只负责干净地展示, 不二次调用模型。
// ============================================================

export interface ReportMeta {
  title?: string;
  publisher?: string;
  date?: string;
  summary?: string;
  topics?: string[];
  cover?: string;
}

export interface TocItem {
  level: number; // 2 | 3
  text: string;
  id: string;
}

export type ChartType = 'bar' | 'hbar' | 'pie' | 'line';
export interface ChartSpec {
  type: ChartType;
  title?: string;
  unit?: string;
  labels: string[];
  values: number[];
  error?: string; // 解析失败时的提示
}

type Block =
  | { kind: 'heading'; level: number; text: string; id: string; headingIndex: number }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; headers: string[]; aligns: ('left' | 'right' | 'center')[]; rows: string[][] }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' }
  | { kind: 'chart'; spec: ChartSpec }
  | { kind: 'code'; text: string };

// ---------- frontmatter ----------
export function parseFrontmatter(md: string): { meta: ReportMeta; body: string } {
  const m = md.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: md };
  const meta: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([\w-]+):\s*(.*)$/);
    if (!mm) continue;
    let v: unknown = mm[2].trim().replace(/^["']|["']$/g, '');
    const raw = mm[2].trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      v = raw.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    meta[mm[1]] = v;
  }
  return { meta: meta as ReportMeta, body: md.slice(m[0].length) };
}

// ---------- 块解析 ----------
function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let headingIndex = 0;
  let i = 0;

  const isTableSep = (s: string): boolean => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s);
  const splitRow = (s: string): string[] =>
    s.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    // 代码块 / 图表块(```chart)
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim().toLowerCase();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i++; }
      i++; // 跳过结束 ```
      if (lang === 'chart') {
        blocks.push({ kind: 'chart', spec: parseChartSpec(buf.join('\n')) });
        continue;
      }
      blocks.push({ kind: 'code', text: buf.join('\n') });
      continue;
    }

    // 分隔线
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { blocks.push({ kind: 'hr' }); i++; continue; }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim().replace(/\s*#+\s*$/, '');
      const idx = headingIndex++;
      blocks.push({ kind: 'heading', level, text, id: `sec-${idx}`, headingIndex: idx });
      i++;
      continue;
    }

    // 表格 (当前行像表头, 下一行是分隔行)
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map<'left' | 'right' | 'center'>((c) => {
        const l = c.startsWith(':'); const r = c.endsWith(':');
        return l && r ? 'center' : r ? 'right' : 'left';
      });
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', headers, aligns, rows });
      continue;
    }

    // 引用块
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', text: buf.join('\n').trim() });
      continue;
    }

    // 列表
    const liMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (liMatch) {
      const ordered = /\d+\./.test(liMatch[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const m2 = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!m2) {
          // 续行 (缩进的非空行) 并入上一条
          if (items.length && /^\s+\S/.test(lines[i]) && lines[i].trim() !== '') {
            items[items.length - 1] += ' ' + lines[i].trim();
            i++;
            continue;
          }
          break;
        }
        items.push(m2[3].trim());
        i++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // 段落 (连续非空行)
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6})\s/.test(lines[i]) && !/^\s*>/.test(lines[i]) && !lines[i].startsWith('```')) {
      // 段落里碰到列表/表格/分隔线就停
      if (/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i])) break;
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) break;
      if (lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) break;
      buf.push(lines[i]);
      i++;
    }
    if (buf.length) blocks.push({ kind: 'paragraph', text: buf.join('\n') });
    else i++;
  }

  return blocks;
}

// ---------- 图表块解析 (```chart 内的 key: value) ----------
function parseChartSpec(text: string): ChartSpec {
  const kv: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([\w-]+)\s*[:：]\s*(.*)$/);
    if (m) kv[m[1].trim().toLowerCase()] = m[2].trim();
  }
  const type = (['bar', 'hbar', 'pie', 'line'].includes(kv.type) ? kv.type : 'bar') as ChartType;
  const splitList = (s?: string): string[] => (s ? s.split(/[,，]/).map((x) => x.trim()).filter((x) => x !== '') : []);
  const labels = splitList(kv.x || kv.labels);
  const values = splitList(kv.y || kv.values || kv.data).map((v) => Number(v.replace(/[^0-9.\-]/g, '')));
  const spec: ChartSpec = { type, title: kv.title, unit: kv.unit, labels, values };
  if (labels.length === 0 || values.length === 0) spec.error = '图表缺少 x / y 数据';
  else if (labels.length !== values.length) spec.error = `x(${labels.length}) 与 y(${values.length}) 数量不一致`;
  else if (values.some((v) => !Number.isFinite(v))) spec.error = 'y 含非数字值';
  return spec;
}

// ---------- TOC ----------
export function extractToc(body: string): TocItem[] {
  return parseBlocks(body)
    .filter((b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading' && (b.level === 2 || b.level === 3))
    .map((b) => ({ level: b.level, text: b.text, id: b.id }));
}

// ---------- 简介提取 (frontmatter.summary > 「报告速览」节 > 首段) ----------
export function extractIntro(meta: ReportMeta, body: string): string {
  if (meta.summary) return meta.summary;
  const blocks = parseBlocks(body);
  // 找「速览/摘要/简介」标题后的首个段落
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === 'heading' && /速览|摘要|简介|执行摘要|概览/.test(b.text)) {
      const next = blocks.slice(i + 1).find((x) => x.kind === 'paragraph');
      if (next && next.kind === 'paragraph') return stripInline(next.text);
    }
  }
  // 否则取第一个段落或引用块
  const first = blocks.find((b) => b.kind === 'paragraph' || b.kind === 'quote');
  if (first && (first.kind === 'paragraph' || first.kind === 'quote')) return stripInline(first.text);
  return '';
}

function stripInline(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/==(.+?)==/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/\n/g, ' ').trim();
}

// ---------- 行内渲染 (**粗体** ==高亮== `代码` [链接](url)) ----------
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // 依次匹配: 链接 / 粗体 / 高亮 / 行内代码
  const re = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(==([^=]+)==)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      out.push(<a key={`${keyPrefix}-${k}`} href={m[3]} target="_blank" rel="noopener noreferrer" className="text-os-blue underline decoration-os-line decoration-1 underline-offset-2 hover:text-os-navy">{m[2]}</a>);
    } else if (m[4]) {
      out.push(<strong key={`${keyPrefix}-${k}`} className="font-semibold text-os-navy">{m[5]}</strong>);
    } else if (m[6]) {
      out.push(<mark key={`${keyPrefix}-${k}`} className="rounded bg-os-spark/15 px-1 py-0.5 font-medium text-os-navy decoration-clone">{m[7]}</mark>);
    } else if (m[8]) {
      out.push(<code key={`${keyPrefix}-${k}`} className="px-1.5 py-0.5 rounded bg-os-mist text-os-navy font-mono text-[0.86em]">{m[9]}</code>);
    }
    last = re.lastIndex;
    k++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ---------- 图表渲染 (零依赖 SVG) ----------
const CHART_COLORS = ['#2C6FD0', '#4F46E5', '#16265E', '#2EA56F', '#7C3AED', '#E08A3C', '#D9695F', '#1F9657', '#5B7BFE', '#8896B8'];

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function ChartBlock({ spec }: { spec: ChartSpec }): JSX.Element {
  if (spec.error) {
    return (
      <div className="my-5 rounded-xl ring-1 ring-amber-200/60 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-700">
        图表无法渲染：{spec.error}
        {spec.title ? <span className="text-amber-600/80">（{spec.title}）</span> : null}
      </div>
    );
  }

  const { type, title, unit, labels, values } = spec;
  const max = Math.max(...values, 0);
  const total = values.reduce((s, v) => s + v, 0);
  const unitLabel = unit ? `（单位：${unit}）` : '';

  const Frame = ({ children }: { children: ReactNode }) => (
    <figure className="my-6 rounded-2xl ring-1 ring-os-line bg-os-paper px-5 py-5 shadow-os">
      {title && <figcaption className="mb-4 text-[14px] font-semibold text-os-navy">{title}<span className="text-[12px] font-normal text-os-muted">{unitLabel}</span></figcaption>}
      {children}
    </figure>
  );

  // 防呆: 所有数值相同(常见于把"分类列举"硬塞成图表, 每项=1) → 等分图无意义, 改用清单/标签呈现
  const allEqual = values.length > 1 && values.every((v) => v === values[0]);
  if (allEqual) {
    return (
      <figure className="my-6 rounded-2xl ring-1 ring-os-line bg-os-paper px-5 py-5 shadow-os">
        {title && <figcaption className="mb-3 text-[14px] font-semibold text-os-navy">{title}</figcaption>}
        <div className="flex flex-wrap gap-2">
          {labels.map((lb, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-os-mist/70 ring-1 ring-os-line px-3 py-1.5 text-[13px] text-os-navy">
              <span className="text-[11px] text-os-muted tabular-nums">{i + 1}</span>{lb}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-os-muted">共 {labels.length} 项 · 分类列举（各项无数值差异，已按清单呈现，不作图表）</p>
      </figure>
    );
  }

  // 横向条形图(排名/长标签首选)
  if (type === 'hbar') {
    const rowH = 30, gap = 10, labelW = 160, barW = 360, valW = 56, W = labelW + barW + valW;
    const H = labels.length * (rowH + gap);
    return (
      <Frame>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H + 'px' }} role="img" aria-label={title}>
          {labels.map((lb, i) => {
            const y = i * (rowH + gap);
            const w = max > 0 ? (values[i] / max) * barW : 0;
            const c = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <g key={i}>
                <text x={labelW - 8} y={y + rowH / 2} textAnchor="end" dominantBaseline="middle" fontSize="12.5" fill="#5A6580">{lb.length > 12 ? lb.slice(0, 12) + '…' : lb}</text>
                <rect x={labelW} y={y} width={barW} height={rowH} rx="5" fill="#EEF1F8" />
                <rect x={labelW} y={y} width={w} height={rowH} rx="5" fill={c} />
                <text x={labelW + w + 6} y={y + rowH / 2} dominantBaseline="middle" fontSize="12" fontWeight="600" fill="#16265E">{fmtNum(values[i])}</text>
              </g>
            );
          })}
        </svg>
      </Frame>
    );
  }

  // 竖向柱状图
  if (type === 'bar') {
    const W = 600, H = 260, padB = 64, padT = 16, padL = 20, padR = 20;
    const n = labels.length;
    const slot = (W - padL - padR) / n;
    const bw = Math.min(slot * 0.6, 56);
    const chartH = H - padB - padT;
    return (
      <Frame>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#E3E6F1" />
          {labels.map((lb, i) => {
            const h = max > 0 ? (values[i] / max) * chartH : 0;
            const x = padL + i * slot + (slot - bw) / 2;
            const y = H - padB - h;
            const c = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <g key={i}>
                <rect x={x} y={y} width={bw} height={h} rx="5" fill={c} />
                <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#16265E">{fmtNum(values[i])}</text>
                <text x={x + bw / 2} y={H - padB + 16} textAnchor="middle" fontSize="11" fill="#5A6580">{lb.length > 6 ? lb.slice(0, 6) + '…' : lb}</text>
              </g>
            );
          })}
        </svg>
      </Frame>
    );
  }

  // 饼图
  if (type === 'pie') {
    const size = 200, r = 88, cx = size / 2, cy = size / 2;
    let acc = 0;
    const arcs = values.map((v, i) => {
      const frac = total > 0 ? v / total : 0;
      const a0 = acc * 2 * Math.PI - Math.PI / 2;
      acc += frac;
      const a1 = acc * 2 * Math.PI - Math.PI / 2;
      const large = frac > 0.5 ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      return { d: `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`, c: CHART_COLORS[i % CHART_COLORS.length], frac };
    });
    return (
      <Frame>
        <div className="flex flex-wrap items-center gap-5">
          <svg viewBox={`0 0 ${size} ${size}`} width="180" height="180" role="img" aria-label={title}>
            {arcs.map((a, i) => <path key={i} d={a.d} fill={a.c} stroke="#fff" strokeWidth="1.5" />)}
          </svg>
          <ul className="flex-1 min-w-[180px] space-y-1.5">
            {labels.map((lb, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-os-ink">
                <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="flex-1 truncate">{lb}</span>
                <span className="tabular-nums text-os-muted">{fmtNum(values[i])}{unit ? '' : ''} · {total > 0 ? Math.round((values[i] / total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      </Frame>
    );
  }

  // 折线图
  const W = 600, H = 240, padB = 48, padT = 16, padL = 36, padR = 16;
  const n = labels.length;
  const stepX = n > 1 ? (W - padL - padR) / (n - 1) : 0;
  const chartH = H - padB - padT;
  const pts = values.map((v, i) => ({ x: padL + i * stepX, y: H - padB - (max > 0 ? (v / max) * chartH : 0) }));
  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <Frame>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#E3E6F1" />
        <polyline points={poly} fill="none" stroke="#2C6FD0" strokeWidth="2.5" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#2C6FD0" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#16265E">{fmtNum(values[i])}</text>
            <text x={p.x} y={H - padB + 16} textAnchor="middle" fontSize="11" fill="#5A6580">{labels[i].length > 6 ? labels[i].slice(0, 6) + '…' : labels[i]}</text>
          </g>
        ))}
      </svg>
    </Frame>
  );
}

// ---------- 主渲染 ----------
export interface RenderOptions {
  /**
   * 试读墙: 只渲染到第 (previewSections+1) 个二级标题(##)之前,
   * 即「开篇 + 前 previewSections 个章节」, 之后截断。不传则渲染全文。
   * 比按百分比截断更整齐(切在章节边界, 不会切在表格中间)。
   */
  previewSections?: number;
  /** 紧凑模式: 缩小标题/边距, 适配 AI 聊天气泡等窄容器 */
  compact?: boolean;
}

export function renderMarkdown(body: string, opts: RenderOptions = {}): { nodes: ReactNode[]; truncated: boolean } {
  const compact = !!opts.compact;
  let blocks = parseBlocks(body);
  let truncated = false;
  const ps = opts.previewSections;
  if (ps != null && ps >= 0) {
    let h2 = 0;
    let cut = blocks.length;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.kind === 'heading' && b.level === 2) {
        h2++;
        if (h2 === ps + 1) { cut = i; break; }
      }
    }
    if (cut < blocks.length) { truncated = true; blocks = blocks.slice(0, cut); }
  }

  const nodes = blocks.map((b, i): ReactNode => {
    const key = `b-${i}`;
    switch (b.kind) {
      case 'heading': {
        const cls = compact
          ? (b.level <= 2 ? 'text-[14.5px] font-semibold text-os-navy mt-6 mb-2 first:mt-0'
            : 'text-[13.5px] font-semibold text-os-navy mt-5 mb-1.5 first:mt-0')
          : b.level === 1 ? 'font-serif-display text-[26px] sm:text-[30px] font-semibold tracking-tight text-os-ink mt-2 mb-4'
          : b.level === 2 ? 'font-serif-display text-[21px] sm:text-[24px] font-semibold tracking-tight text-os-navy mt-12 mb-4 scroll-mt-24 pb-2 border-b border-os-line'
          : b.level === 3 ? 'text-[17px] sm:text-[18px] font-semibold text-os-navy mt-8 mb-3 scroll-mt-24'
          : 'text-[15px] font-semibold text-os-ink mt-6 mb-2 scroll-mt-24';
        const Tag = (`h${Math.min(b.level, 6)}`) as keyof JSX.IntrinsicElements;
        return <Tag key={key} id={compact ? undefined : b.id} className={cls}>{renderInline(b.text, key)}</Tag>;
      }
      case 'paragraph':
        return <p key={key} className={compact ? 'text-[13.5px] leading-[1.85] text-os-ink/90 my-3.5 first:mt-0' : 'text-[15px] leading-[2.0] text-os-ink/90 my-5'}>{renderInline(b.text, key)}</p>;
      case 'quote':
        return (
          <blockquote key={key} className={compact ? 'my-4 rounded-r-lg border-l-[3px] border-os-navy/40 bg-os-mist/50 px-3.5 py-2.5 text-[13px] leading-[1.8] text-os-ink/85' : 'my-6 rounded-r-xl border-l-[3px] border-os-navy/40 bg-os-mist/40 px-5 py-4 text-[15px] leading-[1.95] text-os-ink/85'}>
            {b.text.split('\n').map((ln, j) => <p key={j} className={j ? 'mt-2' : ''}>{renderInline(ln, `${key}-${j}`)}</p>)}
          </blockquote>
        );
      case 'list': {
        const ListTag = (b.ordered ? 'ol' : 'ul') as keyof JSX.IntrinsicElements;
        return (
          <ListTag key={key} className={`${compact ? 'my-3.5 space-y-2 pl-4 text-[13.5px] leading-[1.8]' : 'my-5 space-y-2.5 pl-5 text-[15px] leading-[1.95]'} text-os-ink/90 ${b.ordered ? 'list-decimal' : 'list-disc'} marker:text-os-navy/50`}>
            {b.items.map((it, j) => <li key={j} className="pl-1.5">{renderInline(it, `${key}-${j}`)}</li>)}
          </ListTag>
        );
      }
      case 'table':
        return (
          <div key={key} className="my-5 overflow-x-auto rounded-xl ring-1 ring-os-line">
            <table className="w-full text-[13.5px] border-collapse">
              <thead>
                <tr className="bg-os-mist/60">
                  {b.headers.map((hd, j) => (
                    <th key={j} className={`px-3.5 py-2.5 font-semibold text-os-navy border-b border-os-line whitespace-nowrap ${b.aligns[j] === 'right' ? 'text-right' : b.aligns[j] === 'center' ? 'text-center' : 'text-left'}`}>
                      {renderInline(hd, `${key}-h${j}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r} className="even:bg-os-canvas/40">
                    {row.map((cell, c) => (
                      <td key={c} className={`px-3.5 py-2 text-os-ink/90 border-b border-os-line/60 align-top ${b.aligns[c] === 'right' ? 'text-right tabular-nums' : b.aligns[c] === 'center' ? 'text-center' : 'text-left'}`}>
                        {renderInline(cell, `${key}-${r}-${c}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'hr':
        return <hr key={key} className="my-8 border-os-line" />;
      case 'chart':
        return <ChartBlock key={key} spec={b.spec} />;
      case 'code':
        return (
          <pre key={key} className="my-4 overflow-x-auto rounded-xl bg-os-navy/[0.04] ring-1 ring-os-line p-4 text-[13px] leading-6 text-os-ink font-mono">
            <code>{b.text}</code>
          </pre>
        );
      default:
        return null;
    }
  });

  return { nodes, truncated };
}

/** 给 AI 当上下文用的纯文本 (去掉表格对齐符等噪声, 控制长度) */
export function markdownForAi(body: string, maxChars = 48000): string {
  const clean = body.replace(/\r\n/g, '\n').trim();
  return clean.length > maxChars ? clean.slice(0, maxChars) + '\n\n…(内容过长已截断)' : clean;
}
