import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { MobileAppShell } from '../MobileAppShell';
import { CAPABILITY_ICONS } from '../icons/CapabilityIcons';

// 移动端 App 化首页 = 价值展示页 · 极简风格 (对齐网页极简调性)。
// 原则: 字型主导 / 大留白 / 发丝线分隔 / 不用复杂卡片 / 藏蓝仅作单点强调 / 竖向滚动为主轴。
// 不放产品图(益语AI有专门介绍页), 首页只讲战略咨询的「价值」。意图分析见 docs/MOBILE_APP_REDESIGN_PLAN.md。

interface ScreenProps {
  onNavigate: (page: string, id?: string) => void;
}

const DIMENSIONS = ['影响力', '筹款能力', '业务模式', '品牌信任', '组织效率', '数字化能力'];

const SHIFTS = [
  { pain: '想法很多，方向却不清', after: '清晰的阶段目标与优先级' },
  { pain: '项目很多，却各自为战', after: '服务长期战略的项目组合' },
  { pain: '团队很忙，协作却低效', after: '任务 · 会议 · 复盘的闭环' },
  { pain: '资料经验散落各处', after: '知识底座 + AI，随取随用' },
  { pain: '都说用 AI，却用不起来', after: '团队真正在用的业务应用' },
];

const PHASES = [
  { tag: '前期 · 梳理与诊断', desc: '看清现状，区分表面现象与真实卡点。' },
  { tag: '中期 · 共创战略与机制', desc: '把战略拆成路径、项目、角色与节奏。' },
  { tag: '后期 · 陪伴落地、沉淀能力', desc: '把可复制的部分，沉淀为组织能力。' },
];

const CAPABILITIES = [
  '战略路径清晰化',
  '组织效能重构',
  '数字化与 AI 落地',
  '公益与社会创新',
  '商业增长与战略慈善',
  '内容 · 工具 · 知识沉淀',
];

const PATHS = [
  { title: '深度战略陪伴', desc: '企业 / 组织 leader · 从战略到落地全程', page: 'consult-apply' },
  { title: '益语智库 AI（开源）', desc: '行动者 / 公益 / 小团队 · 低成本用上后台能力', page: 'workbench' },
];

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-os-blue">{children}</p>;
}

export function MobileHomeScreen({ onNavigate }: ScreenProps) {
  return (
    <MobileAppShell onNavigate={onNavigate}>
      <div className="pb-20">
        {/* ── 价值钩子 (字型主导, 大留白) ── */}
        <section className="pt-10 pb-4">
          <p className="text-[12px] tracking-[0.04em] text-os-muted">益语智库 · 助力组织持续增长的战略陪伴者</p>
          <h1 className="mt-6 font-serif-display text-[42px] leading-[1.12] font-semibold text-os-ink">
            可落地的<br />增长咨询
          </h1>
          <p className="mt-7 font-serif-display text-[23px] leading-[1.4] text-os-navy">
            别人给观点，<br />我们交结果。
          </p>
          <p className="mt-5 text-[14px] leading-[1.85] text-os-muted">
            把方向变成机制，把机制变成行动，把行动沉淀为组织能持续使用的能力。
          </p>
          <button onClick={() => onNavigate('consult-apply')}
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-os-navy text-white text-[15px] font-semibold px-7 py-3.5 active:scale-[0.97] transition-transform">
            申请深度战略陪伴 <ArrowRight size={16} />
          </button>
        </section>

        {/* ── 痛点共鸣 ── */}
        <section className="pt-20">
          <Eyebrow>什么叫「可落地」</Eyebrow>
          <h2 className="mt-4 font-serif-display text-[28px] leading-tight font-semibold text-os-ink">
            你是不是<br />也卡在这里？
          </h2>
          <p className="mt-5 text-[13px] leading-relaxed text-os-muted">
            我们说的「增长」，不只是收入——
            <span className="text-os-ink/70">{DIMENSIONS.join(' · ')}</span>
          </p>
          <div className="mt-7 divide-y divide-os-line border-t border-os-line">
            {SHIFTS.map((s, i) => (
              <div key={i} className="py-5">
                <p className="text-[13px] text-os-muted/90 line-through decoration-os-muted/30">{s.pain}</p>
                <p className="mt-1.5 text-[16px] font-medium text-os-ink leading-snug">{s.after}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 怎么陪你 (三段) ── */}
        <section className="pt-20">
          <Eyebrow>我们怎么陪你落地</Eyebrow>
          <h2 className="mt-4 font-serif-display text-[26px] leading-tight font-semibold text-os-ink">
            不做完方案就离场，<br />做你身边的成长合伙人
          </h2>
          <div className="mt-9 space-y-9">
            {PHASES.map((p, i) => (
              <div key={i} className="flex gap-5">
                <span className="font-serif-display text-[26px] leading-none text-os-navy/25 tabular-nums pt-0.5">0{i + 1}</span>
                <div className="flex-1">
                  <h3 className="text-[16.5px] font-semibold text-os-ink">{p.tag}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-os-muted">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 能力广度 (极简列表 + 细图标) ── */}
        <section className="pt-20">
          <Eyebrow>从战略切入</Eyebrow>
          <h2 className="mt-4 font-serif-display text-[26px] leading-tight font-semibold text-os-ink">
            把每件大事<br />想清楚、做出来
          </h2>
          <div className="mt-7 divide-y divide-os-line border-y border-os-line">
            {CAPABILITIES.map((c, i) => {
              const Icon = CAPABILITY_ICONS[i];
              return (
                <div key={c} className="flex items-center gap-4 py-4">
                  <Icon size={21} className="text-os-navy/70 shrink-0" strokeWidth={1.5} />
                  <span className="text-[15.5px] text-os-ink">{c}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-7 text-[12.5px] leading-relaxed text-os-muted">
            正在陪伴 · 公益基金会 / 品牌咨询机构 / 创业公司 / 行业领军企业 / 社会创新组织
          </p>
        </section>

        {/* ── 两条路径 (极简行) ── */}
        <section className="pt-20">
          <Eyebrow>选择适合你的方式</Eyebrow>
          <div className="mt-6 divide-y divide-os-line border-y border-os-line">
            {PATHS.map((p) => (
              <button key={p.title} onClick={() => onNavigate(p.page)}
                className="w-full flex items-center gap-4 py-5 text-left active:opacity-60 transition-opacity">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16.5px] font-semibold text-os-ink">{p.title}</h3>
                  <p className="mt-1 text-[13px] text-os-muted">{p.desc}</p>
                </div>
                <ArrowUpRight size={20} className="text-os-navy/50 shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* ── 收束金句 ── */}
        <section className="pt-20 text-center">
          <p className="font-serif-display text-[22px] leading-[1.5] text-os-ink">“技术是思想的延伸。”</p>
          <p className="mt-3 text-[12.5px] text-os-muted">益语智库，是管理思想与人工智能结合的一次表达。</p>
        </section>
      </div>
    </MobileAppShell>
  );
}
