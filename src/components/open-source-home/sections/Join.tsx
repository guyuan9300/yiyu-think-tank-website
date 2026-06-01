import { Megaphone, Code, Zap, Store, Landmark, type LucideIcon } from 'lucide-react';
import { Container, Section, SectionHeading, Card, Badge, Button, Reveal } from '../ui';
import { PARTICIPATE, ANCHORS } from '../links';
import { useLang, type Bilingual } from '../../../lib/i18n';

type Variant = 'primary' | 'secondary' | 'spark';
const ENTRIES: {
  role: Bilingual;
  icon: LucideIcon;
  fit: Bilingual;
  can: Bilingual;
  cta: Bilingual;
  variant: Variant;
  link: { href: string; external?: boolean };
}[] = [
  {
    role: { zh: '我是行动者', en: 'I am an Actioner' },
    icon: Megaphone,
    fit: { zh: '青年行动者、学生社群、公益组织、小企业团队、独立创作者', en: 'Young actioners, student groups, nonprofits, small-business teams, independent creators' },
    can: { zh: '提交真实行动需求、申请使用开源版、申请算力或模块支持、提交行动故事、参与产品测试。', en: 'Submit real action needs, apply for the open-source edition, request compute or module support, share action stories, and join product testing.' },
    cta: { zh: '提交我的行动需求', en: 'Submit My Action Need' },
    variant: 'primary',
    link: PARTICIPATE.actioner,
  },
  {
    role: { zh: '我是开发者 / IT 支持者', en: 'I am a Developer / IT Supporter' },
    icon: Code,
    fit: { zh: '前端、后端、AI 工程师、产品、测试、设计、技术志愿者', en: 'Frontend, backend, AI engineers, product, QA, design, and tech volunteers' },
    can: { zh: '认领模块、优化功能、提交 PR、写文档、做测试，帮行动者把需求变成可用工具。', en: 'Claim modules, improve features, submit PRs, write docs, and test — helping actioners turn needs into usable tools.' },
    cta: { zh: '参与模块共建', en: 'Help Build Modules' },
    variant: 'secondary',
    link: PARTICIPATE.developer,
  },
  {
    role: { zh: '我是支持者', en: 'I am a Supporter' },
    icon: Zap,
    fit: { zh: '捐赠人、个人支持者、企业 CSR、关注青年行动与公益数字化的人', en: 'Donors, individual supporters, corporate CSR, and anyone who cares about youth action and nonprofit digitalization' },
    can: { zh: '为行动者提供算力，支持一个模块开发，资助一个行动者使用计划，支持公共模块建设。', en: 'Provide compute for actioners, fund a module’s development, sponsor an actioner’s usage plan, and back shared public modules.' },
    cta: { zh: '为行动者加电', en: 'Power Up an Actioner' },
    variant: 'spark',
    link: PARTICIPATE.supporter,
  },
  {
    role: { zh: '我是商家 / 服务伙伴', en: 'I am a Vendor / Service Partner' },
    icon: Store,
    fit: { zh: '软件服务商、培训机构、空间提供方、工具供应商、服务型企业', en: 'Software vendors, training providers, space providers, tool suppliers, and service businesses' },
    can: { zh: '为行动者提供优惠资源、真实应用场景、模块试点机会，参与行动者服务包建设。', en: 'Offer actioners discounted resources, real use cases, and pilot opportunities, and help build the actioner service package.' },
    cta: { zh: '成为资源伙伴', en: 'Become a Resource Partner' },
    variant: 'secondary',
    link: PARTICIPATE.merchant,
  },
  {
    role: { zh: '我是基金会 / 资助伙伴', en: 'I am a Foundation / Funding Partner' },
    icon: Landmark,
    fit: { zh: '基金会、资助型组织、影响力投资机构、教育创新基金、公益数字化资助方', en: 'Foundations, grantmakers, impact investors, education-innovation funds, and nonprofit-digitalization funders' },
    can: { zh: '支持行动者计划，资助公共 AI 模块，共建青年行动者版本，支持公益组织数字化能力建设。', en: 'Support the actioner program, fund shared AI modules, co-build a youth-actioner edition, and strengthen nonprofits’ digital capability.' },
    cta: { zh: '共建行动者生态', en: 'Co-Build the Ecosystem' },
    variant: 'secondary',
    link: PARTICIPATE.foundation,
  },
];

// 加电透明看板：不做假数据，没有真实数字时用状态标签
const BOARD: { label: Bilingual; status: Bilingual }[] = [
  { label: { zh: '可申请加电名额', en: 'Power-Up Slots Open' }, status: { zh: '首批招募中', en: 'First Cohort Recruiting' } },
  { label: { zh: '待认领需求', en: 'Needs to Claim' }, status: { zh: '社区共建中', en: 'Community Building' } },
  { label: { zh: '共建模块', en: 'Co-Built Modules' }, status: { zh: '内测中', en: 'In Beta' } },
  { label: { zh: '支持记录', en: 'Support Records' }, status: { zh: '即将开放', en: 'Coming Soon' } },
  { label: { zh: '行动者故事', en: 'Actioner Stories' }, status: { zh: '征集中', en: 'Collecting Now' } },
];

export function Join() {
  const { t } = useLang();
  return (
    <Section id="join" tone="canvas">
      <Container>
        <SectionHeading
          eyebrow={t({ zh: '加入我们', en: 'Join Us' })}
          title={t({ zh: '一起为行动者加电', en: 'Power up actioners, together' })}
          subtitle={t({ zh: '益语智库不是一个人或一个团队能完成的产品。行动者提出真实问题，开发者共建 AI 模块，支持者提供资源，益语负责价值观、架构、认证和分发。', en: 'Yiyu Institute is not a product one person or one team can finish. Actioners raise real problems, developers co-build AI modules, supporters provide resources, and Yiyu handles the values, architecture, certification, and distribution.' })}
        />

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ENTRIES.map((e, i) => {
            const Icon = e.icon;
            return (
              <Reveal key={e.role.zh} delay={(i % 3) * 80}>
                <Card className="h-full p-7 flex flex-col">
                  <div
                    className={`w-11 h-11 rounded-[13px] flex items-center justify-center mb-5 ${
                      e.variant === 'spark' ? 'bg-os-spark-soft text-os-spark' : 'bg-os-mist text-os-blue'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif-display text-[19px] font-semibold text-os-navy mb-2">{t(e.role)}</h3>
                  <p className="text-[12.5px] leading-relaxed text-os-muted/90 mb-3">
                    <span className="font-semibold text-os-ink/70">{t({ zh: '适合：', en: 'For: ' })}</span>
                    {t(e.fit)}
                  </p>
                  <p className="text-[14px] leading-[1.75] text-os-muted flex-1">{t(e.can)}</p>
                  <div className="mt-6">
                    <Button href={e.link.href} external={e.link.external} variant={e.variant} className="w-full">
                      {t(e.cta)}
                    </Button>
                  </div>
                </Card>
              </Reveal>
            );
          })}

          {/* 第 6 格：加电说明，平衡 3 列布局 */}
          <Reveal delay={160} className="hidden lg:block">
            <div className="h-full rounded-[20px] bg-os-navy text-white p-7 flex flex-col justify-center">
              <p className="font-serif-display text-[20px] leading-[1.5] mb-3">{t({ zh: '为行动加电，', en: 'Powering action,' })}<br />{t({ zh: '不是冷冰冰的募捐。', en: 'not cold fundraising.' })}</p>
              <p className="text-[14px] leading-[1.8] text-white/70">
                {t({ zh: '每一份支持都对应一个真实行动者、一个真实模块、一段真实进展。益语负责把它透明地记录下来。', en: 'Every contribution maps to a real actioner, a real module, and real progress. Yiyu records it all transparently.' })}
              </p>
            </div>
          </Reveal>
        </div>

        {/* 透明看板 */}
        <Reveal delay={120}>
          <div className="mt-8 rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <span className="h-px w-7 bg-os-spark/70" />
              <span className="text-[12px] font-semibold tracking-[0.16em] text-os-spark">{t({ zh: '加电透明看板', en: 'Transparency Board' })}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {BOARD.map((b) => (
                <div key={b.label.zh} className="rounded-[14px] bg-os-canvas ring-1 ring-os-line px-4 py-4">
                  <div className="text-[13px] text-os-muted mb-2">{t(b.label)}</div>
                  <Badge tone="recruit">{t(b.status)}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-os-muted/80">{t({ zh: '看板只展示真实状态，不展示虚构数字。功能上线后会替换为真实进展。', en: 'The board shows real status only, never made-up numbers. It will be replaced with real progress once the feature launches.' })}</p>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
