import { Megaphone, Code, Zap, Store, Landmark, type LucideIcon } from 'lucide-react';
import { Container, Section, SectionHeading, Card, Badge, Button, Reveal } from '../ui';
import { PARTICIPATE, ANCHORS } from '../links';

type Variant = 'primary' | 'secondary' | 'spark';
const ENTRIES: {
  role: string;
  icon: LucideIcon;
  fit: string;
  can: string;
  cta: string;
  variant: Variant;
  link: { href: string; external?: boolean };
}[] = [
  {
    role: '我是行动者',
    icon: Megaphone,
    fit: '青年行动者、学生社群、公益组织、小企业团队、独立创作者',
    can: '提交真实行动需求、申请使用开源版、申请算力或模块支持、提交行动故事、参与产品测试。',
    cta: '提交我的行动需求',
    variant: 'primary',
    link: PARTICIPATE.actioner,
  },
  {
    role: '我是开发者 / IT 支持者',
    icon: Code,
    fit: '前端、后端、AI 工程师、产品、测试、设计、技术志愿者',
    can: '认领模块、优化功能、提交 PR、写文档、做测试，帮行动者把需求变成可用工具。',
    cta: '参与模块共建',
    variant: 'secondary',
    link: PARTICIPATE.developer,
  },
  {
    role: '我是支持者',
    icon: Zap,
    fit: '捐赠人、个人支持者、企业 CSR、关注青年行动与公益数字化的人',
    can: '为行动者提供算力，支持一个模块开发，资助一个行动者使用计划，支持公共模块建设。',
    cta: '为行动者加电',
    variant: 'spark',
    link: PARTICIPATE.supporter,
  },
  {
    role: '我是商家 / 服务伙伴',
    icon: Store,
    fit: '软件服务商、培训机构、空间提供方、工具供应商、服务型企业',
    can: '为行动者提供优惠资源、真实应用场景、模块试点机会，参与行动者服务包建设。',
    cta: '成为资源伙伴',
    variant: 'secondary',
    link: PARTICIPATE.merchant,
  },
  {
    role: '我是基金会 / 资助伙伴',
    icon: Landmark,
    fit: '基金会、资助型组织、影响力投资机构、教育创新基金、公益数字化资助方',
    can: '支持行动者计划，资助公共 AI 模块，共建青年行动者版本，支持公益组织数字化能力建设。',
    cta: '共建行动者生态',
    variant: 'secondary',
    link: PARTICIPATE.foundation,
  },
];

// 加电透明看板：不做假数据，没有真实数字时用状态标签
const BOARD: { label: string; status: string }[] = [
  { label: '可申请加电名额', status: '首批招募中' },
  { label: '待认领需求', status: '社区共建中' },
  { label: '共建模块', status: '内测中' },
  { label: '支持记录', status: '即将开放' },
  { label: '行动者故事', status: '征集中' },
];

export function Join() {
  return (
    <Section id="join" tone="canvas">
      <Container>
        <SectionHeading
          eyebrow="加入我们"
          title="一起为行动者加电"
          subtitle="益语智库不是一个人或一个团队能完成的产品。行动者提出真实问题，开发者共建 AI 模块，支持者提供资源，益语负责价值观、架构、认证和分发。"
        />

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ENTRIES.map((e, i) => {
            const Icon = e.icon;
            return (
              <Reveal key={e.role} delay={(i % 3) * 80}>
                <Card className="h-full p-7 flex flex-col">
                  <div
                    className={`w-11 h-11 rounded-[13px] flex items-center justify-center mb-5 ${
                      e.variant === 'spark' ? 'bg-os-spark-soft text-os-spark' : 'bg-os-mist text-os-blue'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif-display text-[19px] font-semibold text-os-navy mb-2">{e.role}</h3>
                  <p className="text-[12.5px] leading-relaxed text-os-muted/90 mb-3">
                    <span className="font-semibold text-os-ink/70">适合：</span>
                    {e.fit}
                  </p>
                  <p className="text-[14px] leading-[1.75] text-os-muted flex-1">{e.can}</p>
                  <div className="mt-6">
                    <Button href={e.link.href} external={e.link.external} variant={e.variant} className="w-full">
                      {e.cta}
                    </Button>
                  </div>
                </Card>
              </Reveal>
            );
          })}

          {/* 第 6 格：加电说明，平衡 3 列布局 */}
          <Reveal delay={160} className="hidden lg:block">
            <div className="h-full rounded-[20px] bg-os-navy text-white p-7 flex flex-col justify-center">
              <p className="font-serif-display text-[20px] leading-[1.5] mb-3">为行动加电，<br />不是冷冰冰的募捐。</p>
              <p className="text-[14px] leading-[1.8] text-white/70">
                每一份支持都对应一个真实行动者、一个真实模块、一段真实进展。益语负责把它透明地记录下来。
              </p>
            </div>
          </Reveal>
        </div>

        {/* 透明看板 */}
        <Reveal delay={120}>
          <div className="mt-8 rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <span className="h-px w-7 bg-os-spark/70" />
              <span className="text-[12px] font-semibold tracking-[0.16em] text-os-spark">加电透明看板</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {BOARD.map((b) => (
                <div key={b.label} className="rounded-[14px] bg-os-canvas ring-1 ring-os-line px-4 py-4">
                  <div className="text-[13px] text-os-muted mb-2">{b.label}</div>
                  <Badge tone="recruit">{b.status}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-os-muted/80">看板只展示真实状态，不展示虚构数字。功能上线后会替换为真实进展。</p>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
