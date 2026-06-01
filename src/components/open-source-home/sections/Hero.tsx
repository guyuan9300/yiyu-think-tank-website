import { Laptop, Monitor, Smartphone, ArrowRight, type LucideIcon } from 'lucide-react';
import { Container, Button, Reveal } from '../ui';
import { ANCHORS } from '../links';
import { openBetaDownload } from '../betaDownload';
import { HeroProductDemo } from '../demo/HeroProductDemo';
import { useLang, type Bilingual } from '../../../lib/i18n';

// 四平台下载入口（诚实状态：无确认公开下载链接前不标"可下载"）
// 用稳定 key 标识状态语义, 渲染文案走 Bilingual; 让样式判断不依赖中文字面量
type StatusKey = 'available' | 'apply-beta' | 'coming-soon' | 'in-beta';
const STATUS_LABELS: Record<StatusKey, Bilingual> = {
  available: { zh: '可下载', en: 'Available' },
  'apply-beta': { zh: '申请内测', en: 'Apply for Beta' },
  'coming-soon': { zh: '即将开放', en: 'Coming Soon' },
  'in-beta': { zh: '内测中', en: 'In Beta' },
};
const PLATFORMS: { name: string; icon: LucideIcon; status: StatusKey; href?: string }[] = [
  { name: 'macOS', icon: Laptop, status: 'apply-beta', href: ANCHORS.download },
  { name: 'Windows', icon: Monitor, status: 'coming-soon' },
  { name: 'iOS', icon: Smartphone, status: 'in-beta' },
  { name: 'Android', icon: Smartphone, status: 'in-beta' },
];

export function Hero() {
  const { t } = useLang();
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-to-br from-[#EAEBF9] via-[#EFF0FC] to-[#F6F7FD] pt-[68px]">
      {/* 极淡的暖光氛围，非科技霓虹 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] w-[46%] h-[60%] rounded-full bg-os-blue/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-8%] w-[36%] h-[50%] rounded-full bg-os-spark/[0.05] blur-[120px]" />
      </div>

      <Container className="relative">
        <div className="grid lg:grid-cols-[0.92fr_1.08fr] gap-10 lg:gap-14 items-center min-h-[calc(84vh-68px)] py-12 lg:py-0">
          {/* 左：宣言文字 */}
          <div className="max-w-xl min-w-0">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full bg-os-paper ring-1 ring-os-line px-3.5 py-1.5 text-[12.5px] font-semibold text-os-muted shadow-os">
                <span className="w-1.5 h-1.5 rounded-full bg-os-spark" />
                {t({ zh: 'Open Source for Actioners · 益语智库', en: 'Open Source for Actioners · Yiyu Institute' })}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="font-serif-display mt-7 text-[40px] sm:text-[52px] lg:text-[60px] font-semibold leading-[1.12] tracking-tight text-os-navy">
                {t({ zh: '给行动者的', en: 'A gift for' })}
                <br className="hidden sm:block" />
                <span className="text-ink-accent">{t({ zh: '一份礼物', en: 'the doers' })}</span>
              </h1>
            </Reveal>

            <Reveal delay={150}>
              <div className="mt-6 max-w-[560px] space-y-4">
                <p className="text-[17px] sm:text-[19px] font-semibold leading-[1.7] text-os-ink">
                  {t({ zh: '组织真正卡住的地方，往往不是效率不够。', en: 'What truly holds an organization back is rarely a lack of efficiency.' })}
                </p>
                <p className="text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
                  {t({ zh: '而是业务没有被想清楚，关键问题没有被识别，沟通协作不断消耗，数据没有进入决策，经验也没有沉淀成能力。', en: 'It is that the business was never thought through, the key questions go unidentified, collaboration drains energy, data never reaches decisions, and experience never becomes capability.' })}
                </p>
                <p className="text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
                  {t({ zh: '益语智库智能平台，把战略咨询、管理思想与 AI 工作流开源出来，让行动者用更低成本，获得理解业务、推进协作、辅助决策和沉淀经验的后台能力。', en: 'The Yiyu Institute platform open-sources strategy consulting, management thinking, and AI workflows — giving actioners the back-office power to understand their work, drive collaboration, support decisions, and turn experience into capability, all at far lower cost.' })}
                </p>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button onClick={openBetaDownload} variant="primary" withArrow>
                  {t({ zh: '下载开源版', en: 'Download Open Source' })}
                </Button>
                <Button href={ANCHORS.features} variant="secondary">
                  {t({ zh: '查看平台能力', en: 'Explore Capabilities' })}
                </Button>
                <Button href={ANCHORS.join} variant="ghost">
                  {t({ zh: '参与行动者生态', en: 'Join the Ecosystem' })}
                </Button>
              </div>
            </Reveal>

            {/* 次级：平台下载入口（与主行动按钮拉开层级） */}
            <Reveal delay={340}>
              <div className="mt-8">
                <p className="text-[12.5px] leading-relaxed text-os-muted/80 mb-3">
                  {t({ zh: '先从自己的设备开始，让 AI 学会理解你的项目、组织与行动。', en: 'Start on your own device, and let AI learn to understand your projects, your organization, and your actions.' })}
                </p>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5">
                  {PLATFORMS.map((p) => {
                    const Icon = p.icon;
                    const actionable = Boolean(p.href);
                    const body = (
                      <>
                        <Icon className="w-[18px] h-[18px] text-os-navy/65 shrink-0" />
                        <span className="flex flex-col leading-tight">
                          <span className="text-[12px] font-semibold text-os-ink">{p.name}</span>
                          <span className={`text-[10px] ${p.status === 'coming-soon' || p.status === 'in-beta' ? 'text-os-muted/70' : 'text-os-spark'}`}>
                            {t(STATUS_LABELS[p.status])}
                          </span>
                        </span>
                      </>
                    );
                    return actionable ? (
                      <button
                        key={p.name}
                        type="button"
                        onClick={openBetaDownload}
                        className="flex items-center gap-2 rounded-full bg-os-paper ring-1 ring-os-line px-3 py-1.5 hover:ring-os-navy/30 hover:shadow-os transition-all"
                      >
                        {body}
                      </button>
                    ) : (
                      <div
                        key={p.name}
                        aria-disabled="true"
                        title={`${p.name} · ${t(STATUS_LABELS[p.status])}`}
                        className="flex items-center gap-2 rounded-full bg-os-paper/50 ring-1 ring-os-line px-3 py-1.5 opacity-70 cursor-default"
                      >
                        {body}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            {/* 金句：首屏思想的收束 + 宣言入口 */}
            <Reveal delay={400}>
              <div className="mt-9 pt-7 border-t border-os-line/80">
                <p className="border-l-2 border-os-blue/55 pl-4 font-serif-display text-[15.5px] leading-[1.75] text-os-navy/85">
                  {t({ zh: '技术是思想的延伸。益语智库，是管理思想与人工智能结合的一次表达。', en: 'Technology is an extension of thought. Yiyu Institute is one expression of management thinking meeting artificial intelligence.' })}
                </p>
                <a
                  href={ANCHORS.manifesto}
                  className="group mt-3 inline-flex items-center gap-1.5 pl-4 text-[14px] font-semibold text-os-blue hover:text-os-navy transition-colors"
                >
                  {t({ zh: '阅读《行动者宣言》', en: 'Read the Actioner Manifesto' })}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </Reveal>
          </div>

          {/* 右：代码写的产品自动演示（复用 2.1 产品视觉的轻量展示版，非截图/生图） */}
          <Reveal delay={200} className="w-full min-w-0">
            <HeroProductDemo />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
