import { Sprout, HeartHandshake, Briefcase, Code, ArrowRight, type LucideIcon } from 'lucide-react';
import { Container, Section, Card, Button, Reveal } from '../ui';
import { FUTURE_ROUTES, ANCHORS } from '../links';
import { useLang, type Bilingual } from '../../../lib/i18n';

const CASES: {
  num: string;
  role: Bilingual;
  icon: LucideIcon;
  title: Bilingual;
  body: Bilingual;
  flow: [Bilingual, Bilingual, Bilingual];
}[] = [
  {
    num: '01',
    role: { zh: '青年行动者', en: 'Young Actioners' },
    icon: Sprout,
    title: { zh: '夜市收摊后，\n他们把一个想法拆成了 90 天计划', en: 'After closing the night-market stall,\nthey turned an idea into a 90-day plan' },
    body: { zh: '第三次线上会开到晚上十一点，群里还在争：先做调研，还是先办活动？每个人都问过 AI，却得到不同方向。后来，他们把访谈、照片、会议记录和任务同步到同一个项目工作台，AI 给出的建议终于接上了同一份背景。', en: 'The third call ran past eleven, still arguing: research first, or run the event first? Everyone had asked AI, and everyone got a different answer. Once they synced interviews, photos, meeting notes, and tasks into one project workspace, the AI advice finally drew on the same shared context.' },
    flow: [{ zh: '想法很多但没有主线', en: 'Lots of ideas, no through-line' }, { zh: '目标拆解', en: 'Goal decomposition' }, { zh: '松散团队也能持续推进', en: 'A loose team keeps moving' }],
  },
  {
    num: '02',
    role: { zh: '公益组织', en: 'Nonprofit' },
    icon: HeartHandshake,
    title: { zh: '结项前一周，\n她不用再到处追票据', en: 'A week before project close,\nshe no longer chases receipts' },
    body: { zh: '过去每到审计和结项，她都像侦探一样，在钉钉、财务系统、个人电脑和微信群里翻合同、票据和审批记录。用了事件线之后，谁在什么时候做了什么、留下了什么文件，都能沿着项目过程找回来。', en: 'At every audit and project close, she used to play detective — digging through chat apps, finance systems, personal laptops, and group chats for contracts, receipts, and approvals. With a timeline, who did what and when, and which files they left behind, can all be traced along the project itself.' },
    flow: [{ zh: '资料散在不同人手里', en: 'Files scattered across people' }, { zh: '事件线留痕', en: 'Timeline leaves a trail' }, { zh: '项目自己留下证据', en: 'The project keeps its own evidence' }],
  },
  {
    num: '03',
    role: { zh: '中小企业团队', en: 'Small-Business Team' },
    icon: Briefcase,
    title: { zh: '工程师不再用争吵\n证明谁记得对', en: 'Engineers no longer argue\nover who remembered it right' },
    body: { zh: '一次客户事故复盘会上，创始人听到团队互相追问："你说的有什么证据？" 他们原来以为管理是负担，后来才发现，客户资料、合同边界、任务质量和新人成长如果不可见，最亲密的战友也会在协作中彼此消耗。', en: 'In a client post-mortem, the founder heard the team grilling each other: "What is your evidence?" They had thought management was overhead — until they saw that when client records, contract boundaries, task quality, and new-hire growth stay invisible, even the closest teammates wear each other down.' },
    flow: [{ zh: '客户靠人记', en: 'Clients kept in people’s heads' }, { zh: '承诺和证据可见', en: 'Commitments and evidence visible' }, { zh: '协作质量有依据', en: 'Collaboration grounded in facts' }],
  },
  {
    num: '04',
    role: { zh: '开源开发者', en: 'Open-Source Developer' },
    icon: Code,
    title: { zh: '他不再接零散小程序活，\n而是帮小组织搭工作流', en: 'He stopped taking one-off app gigs\nand started building workflows for small orgs' },
    body: { zh: '他接过太多"先做个简单系统"的活。客户说不清需求，方案反复改，代码也很难复用。后来他意识到，自己真正提供的不是几页程序，而是帮中小组织把轻量业务流程梳理清楚，再基于开源 AI 工作流底座快速搭建模块。', en: 'He had taken too many "just build a simple system" jobs — clients who could not state requirements, endless revisions, and code that never got reused. He realized what he truly offers is not a few pages of code, but helping small organizations clarify lightweight workflows, then rapidly assembling modules on an open-source AI workflow foundation.' },
    flow: [{ zh: '低价值定制', en: 'Low-value custom work' }, { zh: '模块化组织', en: 'Modular structure' }, { zh: '服务客户，也参与开源生态', en: 'Serve clients, contribute to open source' }],
  },
];

function SubmitButton({ className = '' }: { className?: string }) {
  const { t } = useLang();
  return (
    <a
      href={ANCHORS.join}
      className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-os-indigo to-os-violet text-white px-6 py-3 min-h-[44px] text-[14.5px] font-semibold shadow-os hover:brightness-110 transition-all active:scale-[0.98] ${className}`}
    >
      {t({ zh: '提交我的行动故事', en: 'Submit My Action Story' })}
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

export function Stories() {
  const { t } = useLang();
  return (
    <Section id="stories" tone="lavender">
      <Container className="relative">
        {/* 提交按钮挪到右上角（桌面），让底部更干净 */}
        <div className="hidden lg:block absolute right-0 top-0">
          <Reveal>
            <SubmitButton />
          </Reveal>
        </div>

        {/* 标题区 */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="h-px w-7 bg-os-indigo/50" />
              <span className="text-[12px] font-semibold tracking-[0.18em] text-os-indigo">{t({ zh: '行动者故事', en: 'Actioner Stories' })}</span>
              <span className="h-px w-7 bg-os-indigo/50" />
            </div>
            <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[42px] font-semibold tracking-tight text-os-navy">
              {t({ zh: '技术不是主角，行动者才是主角', en: 'Technology is not the hero — actioners are' })}
            </h2>
            <p className="mt-6 text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
              {t({ zh: '益语智库不展示 AI 多厉害，而是记录四种真实处境：想法如何变成计划，项目如何留下证据，协作如何变得有依据，开发者如何把零散需求沉淀成可复用模块。', en: 'Yiyu Institute does not show off how clever AI is. It records four real situations: how an idea becomes a plan, how a project keeps its evidence, how collaboration becomes grounded in facts, and how a developer turns scattered requests into reusable modules.' })}
            </p>
          </div>
        </Reveal>

        {/* 4 个故事卡 */}
        <div className="mt-14 grid md:grid-cols-2 gap-6 lg:gap-x-8 items-start">
          {CASES.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.num} delay={(i % 2) * 90} className={i % 2 === 1 ? 'lg:mt-16' : ''}>
                <Card className="p-7 sm:p-8 flex items-start gap-5">
                  <div className="w-12 h-12 rounded-[14px] bg-os-spark-soft text-os-violet flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" strokeWidth={1.7} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-[13px] font-bold text-os-indigo">{c.num}</span>
                      <span className="text-[14px] font-semibold text-os-navy">{t(c.role)}</span>
                    </div>
                    <h3 className="font-serif-display text-[18px] sm:text-[20px] font-semibold leading-[1.5] text-os-navy whitespace-pre-line mb-3">
                      {t(c.title)}
                    </h3>
                    <p className="text-[13.5px] leading-[1.9] text-os-muted mb-5">{t(c.body)}</p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px]">
                      <span className="text-os-muted">{t(c.flow[0])}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-os-muted/45 shrink-0" />
                      <span className="font-semibold text-os-indigo">{t(c.flow[1])}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-os-muted/45 shrink-0" />
                      <span className="text-os-navy/75">{t(c.flow[2])}</span>
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>

        {/* 底部：移动端补回提交按钮 + 阅读完整故事 + 副句 */}
        <div className="mt-14 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SubmitButton className="lg:hidden" />
            <Button href={FUTURE_ROUTES.stories} variant="secondary" withArrow>
              {t({ zh: '阅读完整故事', en: 'Read the Full Stories' })}
            </Button>
          </div>
          <p className="mt-5 text-[14px] text-os-muted">{t({ zh: '你的故事，将被更多行动者看见。', en: 'Your story will be seen by more actioners.' })}</p>
        </div>
      </Container>
    </Section>
  );
}
