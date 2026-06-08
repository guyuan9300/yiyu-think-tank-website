import { Megaphone, Code, HeartHandshake, Zap, type LucideIcon } from 'lucide-react';
import { Container, Section, SectionHeading, Card, Badge, Button, Reveal } from '../ui';
import { PARTICIPATE } from '../links';
import { useLang, type Bilingual } from '../../../lib/i18n';

type Variant = 'primary' | 'secondary' | 'spark';
// 4 个角色组成一条价值链:行动者出题 → 开发者造工具 → 支持方供资源 → 资助方供能。
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
    fit: { zh: '任何有真实行动要推进的人或团队 —— 青年行动者、公益组织、学生社群、小企业团队、独立创作者，以及战略咨询与基金会运营者。', en: 'Anyone with a real action to push — young actioners, nonprofits, student groups, small-business teams, independent creators, and strategy consultants or foundation operators.' },
    can: { zh: '提出你要做的真实需求、申请使用开源版、申请算力/模块支持、提交行动故事、参与产品内测。', en: 'Raise the real need you want to push, apply for the open-source edition, request compute/module support, share action stories, and join the beta.' },
    cta: { zh: '提出我的需求', en: 'Raise My Need' },
    variant: 'primary',
    link: PARTICIPATE.actioner,
  },
  {
    role: { zh: '我是开发者 · 技术伙伴', en: 'I am a Developer · Tech Partner' },
    icon: Code,
    fit: { zh: '前端、后端、AI 工程师、产品、测试、设计、技术志愿者、技术服务商 —— 门槛不在「大神」，在「愿意动手」。', en: 'Frontend, backend, AI engineers, product, QA, design, tech volunteers, tech vendors — the bar is not “genius,” it’s “willing to build.”' },
    can: { zh: '认领一个真实模块、优化功能、提交 PR、写文档、做测试，把行动者的需求变成能用的工具。', en: 'Claim a real module, improve features, submit PRs, write docs, and test — turning actioners’ needs into usable tools.' },
    cta: { zh: '认领一个模块', en: 'Claim a Module' },
    variant: 'secondary',
    link: PARTICIPATE.developer,
  },
  {
    role: { zh: '我是支持方', en: 'I am a Supporter' },
    icon: HeartHandshake,
    fit: { zh: '企业 CSR、软件/服务供应商、培训机构、空间提供方、行业专家与咨询顾问。', en: 'Corporate CSR, software/service vendors, training providers, space providers, industry experts and consultants.' },
    can: { zh: '提供场地与免费服务资源、贡献领域方法论、给行动者真实应用场景、参与模块试点 —— 不一定是钱。', en: 'Offer space and free service resources, contribute domain methodology, give actioners real use cases, and join module pilots — money is not required.' },
    cta: { zh: '贡献我的资源', en: 'Contribute Resources' },
    variant: 'secondary',
    link: PARTICIPATE.merchant,
  },
  {
    role: { zh: '我是资助方', en: 'I am a Funder' },
    icon: Zap,
    fit: { zh: '基金会、资助型组织、影响力投资机构、企业、个人资助者。', en: 'Foundations, grantmakers, impact investors, companies, and individual funders.' },
    can: { zh: '资助算力、资助一个公共模块、资助一个行动者使用计划、支持公益数字化能力建设。', en: 'Fund compute, fund a shared public module, sponsor an actioner’s usage plan, and back nonprofit digital capability.' },
    cta: { zh: '为社区加电', en: 'Power Up the Community' },
    variant: 'spark',
    link: PARTICIPATE.supporter,
  },
];

// 加电透明看板：不做假数据，没有真实数字时用状态标签
const BOARD: { label: Bilingual; status: Bilingual }[] = [
  { label: { zh: '可申请加电名额', en: 'Power-Up Slots Open' }, status: { zh: '首批招募中', en: 'First Cohort Recruiting' } },
  { label: { zh: '待认领需求', en: 'Needs to Claim' }, status: { zh: '社区共建中', en: 'Community Building' } },
  { label: { zh: '共建模块', en: 'Co-Built Modules' }, status: { zh: '内测中', en: 'In Beta' } },
  { label: { zh: '支持 / 加电记录', en: 'Support Records' }, status: { zh: '即将开放', en: 'Coming Soon' } },
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
          subtitle={t({ zh: '益语智库不是一个人或一个团队能完成的产品。行动者提出真实需求，开发者把它变成 AI 模块，支持方供资源、资助方供能，益语负责价值观、架构、认证与分发。', en: 'Yiyu Institute is not a product one person or one team can finish. Actioners raise real needs, developers turn them into AI modules, supporters provide resources, funders provide power, and Yiyu handles the values, architecture, certification, and distribution.' })}
        />

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ENTRIES.map((e, i) => {
            const Icon = e.icon;
            return (
              <Reveal key={e.role.zh} delay={(i % 4) * 80}>
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
        </div>

        {/* 价值宣言：整宽 navy 带，承接到透明看板 */}
        <Reveal delay={120}>
          <div className="mt-8 rounded-[20px] bg-os-navy text-white p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="font-serif-display text-[20px] leading-[1.5] shrink-0">
              {t({ zh: '为行动加电，', en: 'Powering action,' })}<br />{t({ zh: '不是冷冰冰的募捐。', en: 'not cold fundraising.' })}
            </p>
            <p className="text-[14px] leading-[1.8] text-white/70 sm:max-w-[58%]">
              {t({ zh: '每一份支持都对应一个真实行动者、一个真实模块、一段真实进展。益语负责把它透明地记录下来。', en: 'Every contribution maps to a real actioner, a real module, and real progress. Yiyu records it all transparently.' })}
            </p>
          </div>
        </Reveal>

        {/* 透明看板 */}
        <Reveal delay={160}>
          <div className="mt-6 rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os p-6 sm:p-7">
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
