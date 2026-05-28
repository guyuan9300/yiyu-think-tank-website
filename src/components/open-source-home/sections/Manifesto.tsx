import { Target, Network, Users, TrendingUp, ArrowRight, type LucideIcon } from 'lucide-react';
import { Container, Section, Card, Reveal } from '../ui';

const CARDS: {
  num: string;
  icon: LucideIcon;
  title: string;
  highlight: string;
  body: string;
  ability: string;
}[] = [
  {
    num: '01',
    icon: Target,
    title: '成功始于清晰的问题，而非好点子',
    highlight: '好点子已经不值钱了，找对问题才是第一步。',
    body: '真正的机会藏在真实世界的问题里。成功的第一步，不是追逐灵感，而是深入理解用户、行业和趋势，找到那个值得用一生去解决的问题。',
    ability: '洞察问题的本质',
  },
  {
    num: '02',
    icon: Network,
    title: '把想法拆解，才知道如何开始',
    highlight: '没有拆解，一切都是空中楼阁。',
    body: '伟大的想法需要被拆解成可执行的路径：目标、里程碑、关键任务、资源需求和验证指标。拆解让模糊变清晰，让不可能变成下一步。',
    ability: '结构化拆解与路径设计',
  },
  {
    num: '03',
    icon: Users,
    title: '组织合适的人，一起解决问题',
    highlight: '一个人可以走得快，一群人才能走得远。',
    body: '组织的本质，是让不同的人在同一个方向上发挥最大的价值。找到合适的伙伴，建立信任和协作机制，是放大想法的关键。',
    ability: '组建与协同',
  },
  {
    num: '04',
    icon: TrendingUp,
    title: '持续迭代，在行动中接近成功',
    highlight: '没有完美的计划，只有不断进化的系统。',
    body: '在真实的市场与用户反馈中迭代，快速试错，持续优化产品、商业模式和组织能力。成功不是终点，而是持续进化的结果。',
    ability: '迭代与进化',
  },
];

export function Manifesto() {
  return (
    <Section id="manifesto" tone="canvas">
      <Container>
        {/* 标题区 */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <span className="h-px w-7 bg-os-violet/60" />
              <span className="text-[12px] font-semibold tracking-[0.18em] text-os-violet">行动者启示</span>
            </div>
            <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold leading-[1.32] tracking-tight text-os-navy">
              成功的本质，不是灵感，
              <br />
              而是把想法变为现实的能力
            </h2>
            <p className="mt-6 text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
              益语智库陪伴众多创业者和创业公司，从 0 到 1，从 1 到 ∞。我们发现，真正决定成败的，不是少数天才的灵感，而是那些可复制、可积累、可持续的底层能力。
            </p>
          </div>
        </Reveal>

        {/* 4 张能力卡 */}
        <div className="mt-14 grid md:grid-cols-2 gap-6">
          {CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.num} delay={(i % 2) * 90}>
                <Card className="h-full p-7 sm:p-8">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-[14px] bg-os-spark-soft text-os-violet flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-serif-display text-[34px] font-semibold leading-none text-os-violet/25 shrink-0">
                      {c.num}
                    </span>
                    <h3 className="font-serif-display text-[17px] sm:text-[19px] font-semibold leading-snug text-os-navy">
                      {c.title}
                    </h3>
                  </div>
                  <p className="text-[14px] font-semibold leading-relaxed text-os-violet mb-3">{c.highlight}</p>
                  <p className="text-[14px] leading-[1.85] text-os-muted mb-6">{c.body}</p>
                  <div className="flex items-center gap-2 rounded-xl bg-os-mist/70 px-4 py-3 text-[13px] font-medium text-os-navy/75">
                    <ArrowRight className="w-4 h-4 text-os-violet shrink-0" />
                    关键能力：{c.ability}
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>

      </Container>
    </Section>
  );
}
