import { ArrowRight, ChevronRight } from 'lucide-react';
import { type ReactNode } from 'react';
import { MobileAppShell } from '../MobileAppShell';
import { CAPABILITY_ICONS } from '../icons/CapabilityIcons';

// 移动端 App 化首页 = 价值展示页。风格: 极简 + iOS inset-grouped「App 感」。
// 关键: 极简不等于纯文字流(那是网页) —— 用「带色底 + 白色圆角分组面 + 分组标签」建立结构感,
// 既克制留白, 又一眼是 App。不放产品图。意图分析见 docs/MOBILE_APP_REDESIGN_PLAN.md。

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

/** iOS 式分组: 小标签 + 白色圆角面 */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p className="px-1 mb-2.5 text-[12px] font-semibold tracking-wide text-os-muted">{label}</p>
      <div className="rounded-[20px] bg-white ring-1 ring-os-line/70 shadow-[0_1px_2px_rgba(22,38,94,0.04)] overflow-hidden">
        {children}
      </div>
    </section>
  );
}

export function MobileHomeScreen({ onNavigate }: ScreenProps) {
  return (
    <MobileAppShell onNavigate={onNavigate}>
      <div className="pb-16">
        {/* ── 大标题 Hero (坐落于带色底) ── */}
        <section className="pt-8 pb-9">
          <p className="text-[12px] tracking-[0.04em] text-os-muted">益语智库 · 战略陪伴者</p>
          <h1 className="mt-4 font-serif-display text-[40px] leading-[1.1] font-semibold text-os-ink">
            可落地的<br />增长咨询
          </h1>
          <p className="mt-6 font-serif-display text-[22px] leading-[1.4] text-os-navy">
            别人给观点，我们交结果。
          </p>
          <p className="mt-4 text-[13.5px] leading-[1.8] text-os-muted">
            把方向变成机制，把机制变成行动，把行动沉淀为组织能持续使用的能力。
          </p>
          <button onClick={() => onNavigate('consult-apply')}
            className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-os-navy text-white text-[15.5px] font-semibold py-4 shadow-[0_10px_24px_-12px_rgba(22,38,94,0.6)] active:scale-[0.98] transition-transform">
            申请深度战略陪伴 <ArrowRight size={17} />
          </button>
        </section>

        <div className="space-y-9">
          {/* ── 痛点共鸣 ── */}
          <div>
            <div className="px-1 mb-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-os-blue">什么叫「可落地」</p>
              <h2 className="mt-2.5 font-serif-display text-[26px] leading-tight font-semibold text-os-ink">你是不是也卡在这里？</h2>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-os-muted">
                我们说的「增长」不只是收入 · <span className="text-os-ink/65">{DIMENSIONS.join(' · ')}</span>
              </p>
            </div>
            <div className="rounded-[20px] bg-white ring-1 ring-os-line/70 shadow-[0_1px_2px_rgba(22,38,94,0.04)] divide-y divide-os-line/80">
              {SHIFTS.map((s, i) => (
                <div key={i} className="px-4 py-3.5 flex items-center gap-3">
                  <span className="flex-1 text-[12.5px] text-os-muted/90 line-through decoration-os-muted/30">{s.pain}</span>
                  <ArrowRight size={14} className="text-os-blue/45 shrink-0" />
                  <span className="flex-1 text-[13.5px] font-medium text-os-ink text-right">{s.after}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 怎么陪你 ── */}
          <Group label="我们怎么陪你落地">
            <div className="divide-y divide-os-line/80">
              {PHASES.map((p, i) => (
                <div key={i} className="px-4 py-4 flex gap-3.5">
                  <span className="font-serif-display text-[20px] leading-none text-os-navy/30 tabular-nums pt-0.5">0{i + 1}</span>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-os-ink">{p.tag}</h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-os-muted">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Group>

          {/* ── 能力领域 ── */}
          <Group label="从战略切入 · 能力领域">
            <div className="divide-y divide-os-line/80">
              {CAPABILITIES.map((c, i) => {
                const Icon = CAPABILITY_ICONS[i];
                return (
                  <div key={c} className="px-4 py-3.5 flex items-center gap-3.5">
                    <Icon size={20} className="text-os-navy/65 shrink-0" strokeWidth={1.6} />
                    <span className="text-[15px] text-os-ink">{c}</span>
                  </div>
                );
              })}
            </div>
          </Group>

          {/* ── 正在陪伴的组织 ── */}
          <p className="px-1 text-[12px] leading-relaxed text-os-muted">
            正在陪伴 · 公益基金会 / 品牌咨询机构 / 创业公司 / 行业领军企业 / 社会创新组织
          </p>

          {/* ── 两条路径 ── */}
          <Group label="选择适合你的方式">
            <div className="divide-y divide-os-line/80">
              {PATHS.map((p) => (
                <button key={p.title} onClick={() => onNavigate(p.page)}
                  className="w-full px-4 py-4 flex items-center gap-3 text-left active:bg-os-mist/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15.5px] font-semibold text-os-ink">{p.title}</h3>
                    <p className="mt-0.5 text-[12.5px] text-os-muted">{p.desc}</p>
                  </div>
                  <ChevronRight size={19} className="text-os-muted/50 shrink-0" />
                </button>
              ))}
            </div>
          </Group>

          {/* ── 金句 ── */}
          <section className="pt-6 pb-2 text-center">
            <p className="font-serif-display text-[20px] leading-[1.5] text-os-ink">“技术是思想的延伸。”</p>
            <p className="mt-2.5 text-[12px] text-os-muted">益语智库，是管理思想与人工智能结合的一次表达。</p>
          </section>
        </div>
      </div>
    </MobileAppShell>
  );
}
