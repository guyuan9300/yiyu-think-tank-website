import { ArrowRight, ChevronRight, Check } from 'lucide-react';
import { type ReactNode } from 'react';
import { MobileAppShell } from '../MobileAppShell';
import { Reveal } from '../Reveal';
import { CAPABILITY_ICONS } from '../icons/CapabilityIcons';

// 移动端 App 化首页 = 价值展示页。风格: 极简 + iOS 分组 + 灰度质感过渡 + 滚动惊喜。
// 反「单调」: 分组面微渐变/深色收束区/噪点肌理 制造节奏; 逐行级联 + 强调条生长 制造惊喜。
// 意图分析见 docs/MOBILE_APP_REDESIGN_PLAN.md。

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
  '战略路径清晰化', '组织效能重构', '数字化与 AI 落地',
  '公益与社会创新', '商业增长与战略慈善', '内容 · 工具 · 知识沉淀',
];

const PATHS = [
  { title: '深度战略陪伴', desc: '企业 / 组织 leader · 全程陪伴', page: 'consult-apply' },
  { title: '益语智库 AI（开源）', desc: '行动者 / 公益 / 小团队', page: 'workbench' },
];

const SURFACE = 'rounded-[20px] bg-gradient-to-b from-white to-[#fafbfe] ring-1 ring-os-line/70 shadow-[0_1px_2px_rgba(22,38,94,0.04),0_18px_36px_-26px_rgba(22,38,94,0.28)]';

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p className="px-1 mb-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-os-muted">{label}</p>
      <div className={`${SURFACE} overflow-hidden`}>{children}</div>
    </section>
  );
}

export function MobileHomeScreen({ onNavigate }: ScreenProps) {
  return (
    <MobileAppShell onNavigate={onNavigate} scrollTitle="可落地的增长咨询">
      <div className="pb-14">
        {/* ── 大标题 Hero (错峰入场) ── */}
        <section className="pt-9 pb-10">
          <Reveal><p className="text-[12px] tracking-[0.04em] text-os-muted">益语智库 · 战略陪伴者</p></Reveal>
          <Reveal delay={80}>
            <h1 className="mt-4 font-serif-display text-[42px] leading-[1.08] font-semibold text-os-ink">
              可落地的<br />增长咨询
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <div className="mt-6 flex items-stretch gap-3">
              <span className="bar-grow w-[3px] rounded-full bg-gradient-to-b from-os-blue to-os-navy" />
              <p className="font-serif-display text-[22px] leading-[1.35] text-os-navy">
                别人给观点，<br />我们交结果。
              </p>
            </div>
          </Reveal>
          <Reveal delay={250}>
            <p className="mt-5 text-[13.5px] leading-[1.85] text-os-muted">
              把方向变成机制，把机制变成行动，把行动沉淀为组织能持续使用的能力。
            </p>
          </Reveal>
          <Reveal delay={330}>
            <button onClick={() => onNavigate('consult-apply')}
              className="group mt-8 w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white text-[15.5px] font-semibold py-4
                bg-gradient-to-br from-[#22417f] to-[#14224f]
                shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_32px_-12px_rgba(22,38,94,0.7)] active:scale-[0.98] transition-transform">
              申请深度战略陪伴
              <ArrowRight size={17} className="transition-transform duration-300 group-active:translate-x-1" />
            </button>
          </Reveal>
        </section>

        <div className="space-y-10">
          {/* ── 痛点共鸣 (逐行级联) ── */}
          <div>
            <Reveal>
              <div className="px-1 mb-4">
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-os-blue">什么叫「可落地」</p>
                <h2 className="mt-2.5 font-serif-display text-[27px] leading-tight font-semibold text-os-ink">你是不是也卡在这里？</h2>
                <p className="mt-3 text-[12.5px] leading-relaxed text-os-muted">
                  我们说的「增长」不只是收入 · <span className="text-os-ink/65">{DIMENSIONS.join(' · ')}</span>
                </p>
              </div>
            </Reveal>
            <div className={`${SURFACE} divide-y divide-os-line/70`}>
              {SHIFTS.map((s, i) => (
                <Reveal key={i} delay={i * 70}>
                  <div className="px-4 py-4">
                    <p className="text-[11.5px] text-os-muted/75 line-through decoration-os-muted/30">{s.pain}</p>
                    <p className="mt-1.5 flex items-start gap-2 text-[14.5px] font-medium text-os-ink leading-snug">
                      <Check size={15} className="mt-[3px] text-os-blue shrink-0" strokeWidth={2.6} />
                      {s.after}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* ── 怎么陪你 ── */}
          <Reveal>
            <Group label="我们怎么陪你落地">
              <div className="divide-y divide-os-line/70">
                {PHASES.map((p, i) => (
                  <div key={i} className="px-4 py-4 flex gap-4">
                    <span className="font-serif-display text-[21px] leading-none text-os-navy/25 tabular-nums pt-0.5">0{i + 1}</span>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-semibold text-os-ink">{p.tag}</h3>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-os-muted">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Group>
          </Reveal>

          {/* ── 能力领域 (逐行级联) ── */}
          <div>
            <Reveal><p className="px-1 mb-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-os-muted">从战略切入 · 能力领域</p></Reveal>
            <div className={`${SURFACE} divide-y divide-os-line/70`}>
              {CAPABILITIES.map((c, i) => {
                const Icon = CAPABILITY_ICONS[i];
                return (
                  <Reveal key={c} delay={i * 55}>
                    <div className="px-4 py-3.5 flex items-center gap-3.5">
                      <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-os-mist/80 to-os-mist/30 items-center justify-center text-os-navy/75 shrink-0">
                        <Icon size={19} strokeWidth={1.6} />
                      </span>
                      <span className="text-[15px] text-os-ink">{c}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* ── 正在陪伴的组织 ── */}
          <Reveal>
            <p className="px-1 text-[12px] leading-relaxed text-os-muted">
              <span className="text-os-ink/55">正在陪伴 ·</span> 公益基金会 / 品牌咨询机构 / 创业公司 / 行业领军企业 / 社会创新组织
            </p>
          </Reveal>

          {/* ── 两条路径 ── */}
          <Reveal>
            <Group label="选择适合你的方式">
              <div className="divide-y divide-os-line/70">
                {PATHS.map((p) => (
                  <button key={p.title} onClick={() => onNavigate(p.page)}
                    className="w-full px-4 py-4 flex items-center gap-3 text-left active:bg-os-mist/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15.5px] font-semibold text-os-ink">{p.title}</h3>
                      <p className="mt-0.5 text-[12.5px] text-os-muted">{p.desc}</p>
                    </div>
                    <ChevronRight size={19} className="text-os-muted/45 shrink-0" />
                  </button>
                ))}
              </div>
            </Group>
          </Reveal>

          {/* ── 深色收束金句 (满幅 · 噪点 · 光晕) ── */}
          <Reveal>
            <section className="tex-grain relative -mx-5 mt-2 px-8 py-14 overflow-hidden text-center
              bg-[radial-gradient(130%_120%_at_50%_-10%,#22417f_0%,#16265E_50%,#0d1a40_100%)]">
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-40 rounded-full bg-os-blue/25 blur-3xl" />
              <p className="relative font-serif-display text-[23px] leading-[1.5] text-white">“技术是思想的延伸。”</p>
              <p className="relative mt-3.5 text-[12.5px] leading-relaxed text-white/60">益语智库，是管理思想与人工智能结合的一次表达。</p>
            </section>
          </Reveal>
        </div>
      </div>
    </MobileAppShell>
  );
}
