import { Eye, Lightbulb, Wrench, ArrowRight, type LucideIcon } from 'lucide-react';
import { Container, Section, Card, Button, Reveal } from '../ui';

// ============================================================
// 益语智库思想介绍 — 插在 Manifesto (行动者启示 4 卡) 和 QuoteBand
// (深蓝金句带) 之间。
//
// 叙事位置：Manifesto 讲"行动者看到的真相 4 个能力" → 本 section 讲
// "益语智库是谁 + 我们看到的真相 + 我们的回应" → QuoteBand 把这套
// 思想凝成一句金句，再进入 Features 软件功能演示。
//
// 视觉差异化：Manifesto 是 2x2 4 张大卡 (canvas)，本 section 用
// 3 横向块 + 下方客户认知带，paper 底，节奏区分；CTA 双按钮承接
// "申请深度战略陪伴" (consult-apply) 与 "了解开源工作台" (#features)。
// ============================================================

const PILLARS: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
}[] = [
  {
    icon: Eye,
    eyebrow: '我们的视角',
    title: '组织经营是一个整体，不是模块拼图',
    body: '今天所有的工具都在切碎它——HR 软件管人、协作软件管沟通、CRM 管客户。碎片化的代价是组织作为整体不能被 AI 理解、不能被持续陪伴。',
  },
  {
    icon: Lightbulb,
    eyebrow: '我们的思想',
    title: '战略不是给一次点子，是持续被承载',
    body: '传统咨询给点子，离场后留下文件；益语智库把对组织和业务的理解，沉淀为方法、AI 工作流、组织工具，让思想留下来继续陪伴客户。',
  },
  {
    icon: Wrench,
    eyebrow: '我们的工具',
    title: '一个 AI 友好的组织整体工作系统',
    body: '不是另一个功能切片，而是把战略、任务、客户、知识、决策放在同一个画布上，让 AI 能读到全景、能基于全景帮助组织做事。',
  },
];

// ⚠️ 客户占位：守 ANTI_FAKE 红线，上线前换成真实客户标识（需征得客户授权后再露出名称/logo）。
const CLIENT_PLACEHOLDERS: { label: string; kind: string }[] = [
  { label: '公益基金会', kind: '战略陪伴 + 工作台部署' },
  { label: '品牌咨询机构', kind: '组织能力沉淀' },
  { label: '创业公司 · 早期', kind: '0→1 阶段陪伴' },
  { label: '行业领军企业', kind: '组织数字化转型' },
  { label: '社会创新组织', kind: '使命驱动经营' },
];

export function IntroduceYiyu() {
  return (
    <Section id="about-yiyu" tone="paper">
      <Container>
        {/* 标题区 */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <span className="h-px w-7 bg-os-blue/70" />
              <span className="text-[12px] font-semibold tracking-[0.18em] text-os-blue">
                关于益语智库
              </span>
              <span className="h-px w-7 bg-os-blue/70" />
            </div>
            <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold leading-[1.32] tracking-tight text-os-navy">
              组织经营是一个整体，
              <br />
              <span className="text-ink-accent">但今天所有工具都把它切碎了</span>
            </h2>
            <p className="mt-6 text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
              传统咨询给点子，传统 SaaS 切功能——没人在解决"组织作为整体如何被 AI 理解、被持续陪伴"这件事。
              益语智库做的，就是把多年战略咨询沉淀的组织思想，用 AI 和工具承载下来，作为持续陪伴客户的一种新方式。
            </p>
          </div>
        </Reveal>

        {/* 3 横向块: 视角 / 思想 / 工具 */}
        <div className="mt-14 grid md:grid-cols-3 gap-5 lg:gap-6">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.eyebrow} delay={i * 80}>
                <Card className="h-full p-6 sm:p-7">
                  <div className="w-11 h-11 rounded-[12px] bg-os-mist text-os-navy flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-[12px] font-semibold tracking-[0.16em] text-os-blue mb-2">
                    {p.eyebrow}
                  </div>
                  <h3 className="font-serif-display text-[18px] sm:text-[20px] font-semibold leading-snug text-os-navy mb-3">
                    {p.title}
                  </h3>
                  <p className="text-[14px] leading-[1.85] text-os-muted">{p.body}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>

        {/* 客户认知带 */}
        <Reveal>
          <div className="mt-16 pt-10 border-t border-os-line">
            <p className="text-center text-[12px] tracking-[0.2em] font-semibold text-os-muted/70 mb-8">
              益语智库正在陪伴的组织
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {CLIENT_PLACEHOLDERS.map((c) => (
                <div
                  key={c.label}
                  className="rounded-[14px] ring-1 ring-os-line bg-os-canvas/60 px-4 py-5 text-center"
                >
                  <div className="text-[14px] font-semibold text-os-navy/85 leading-tight">
                    {c.label}
                  </div>
                  <div className="mt-1.5 text-[11px] text-os-muted/75 leading-relaxed">
                    {c.kind}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-[11px] text-os-muted/55">
              * 部分客户出于隐私约定暂以类型呈现；完整合作请见{' '}
              <a
                href="?page=about"
                className="underline decoration-os-line hover:text-os-blue transition-colors"
              >
                关于我们
              </a>
            </p>
          </div>
        </Reveal>

        {/* 双 CTA */}
        <Reveal>
          <div className="mt-14 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button href="?page=consult-apply" variant="primary" withArrow>
              申请深度战略陪伴
            </Button>
            <Button href="#features" variant="secondary" withArrow>
              了解开源工作台
            </Button>
          </div>
          <p className="mt-4 text-center text-[12px] text-os-muted/65">
            企业 / 组织 leader 走战略陪伴线 · 行动者 / 公益 / 小团队 走开源工作台线
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
