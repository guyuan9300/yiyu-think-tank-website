import React from 'react';
import { ArrowLeft, Target, Users, Zap, Layers } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';

export type StrategyModuleKey = 'strategy-path' | 'business-design' | 'org-effectiveness' | 'digital-ai';

interface StrategyModuleIntroPageProps {
  module: StrategyModuleKey;
  onNavigate?: (page: any) => void;
}

const MODULES: Record<StrategyModuleKey, {
  title: string;
  en: string;
  icon: React.ReactNode;
  accent: 'primary' | 'secondary' | 'accent';
  insightTitle: string;
  insight: string;
  stats: Array<{ value: string; label: string }>;
}> = {
  'strategy-path': {
    title: '战略路径清晰化',
    en: 'Strategy Path Clarification',
    icon: <Target className="w-8 h-8" />,
    accent: 'primary',
    insightTitle: '核心洞察',
    insight:
      '战略不是写在纸上的宏大叙事，而是能够指导日常决策的行动指南。我们帮助企业将战略意图转化为清晰、可执行的行动路径，让每个团队成员都能理解自己的工作如何支撑整体目标的实现。',
    stats: [
      { value: '500+', label: '战略规划项目' },
      { value: '92%', label: '战略落地率' },
      { value: '3个月', label: '完成周期' },
    ],
  },
  'business-design': {
    title: '业务设计体系化',
    en: 'Business Design Systematization',
    icon: <Layers className="w-8 h-8" />,
    accent: 'primary',
    insightTitle: '核心洞察',
    insight:
      '业务设计不是简单的产品包装，而是战略价值的结构化表达。我们帮助企业将战略目标转译为清晰的业务模型、产品体系与交付路径，让战略真正转化为可持续的收入结构与市场竞争力。',
    stats: [
      { value: '400+', label: '业务设计项目' },
      { value: '60%', label: '盈利结构优化率' },
      { value: '5个月', label: '产品体系构建周期' },
    ],
  },
  'org-effectiveness': {
    title: '组织效能重构',
    en: 'Organization Effectiveness',
    icon: <Users className="w-8 h-8" />,
    accent: 'secondary',
    insightTitle: '核心洞察',
    insight:
      '组织效能的提升不是简单的裁员或架构调整，而是要建立与战略对齐的组织能力。我们从组织诊断出发，帮助企业识别效能瓶颈，设计针对性的解决方案，让组织成为战略落地的强大引擎。',
    stats: [
      { value: '300+', label: '组织诊断项目' },
      { value: '35%', label: '效能提升均值' },
      { value: '6个月', label: '改善周期' },
    ],
  },
  'digital-ai': {
    title: '数字化与AI落地赋能',
    en: 'Digital & AI Implementation',
    icon: <Zap className="w-8 h-8" />,
    accent: 'accent',
    insightTitle: '核心洞察',
    insight:
      '数字化转型的核心不是技术，而是组织学习能力的升级。我们帮助企业建立数据驱动的决策体系，落地AI工具到实际业务流程，让技术真正成为驱动业务增长的引擎，而不是成本中心。',
    stats: [
      { value: '200+', label: '数字化项目' },
      { value: '50%', label: '效率提升' },
      { value: '4个月', label: 'MVP周期' },
    ],
  },
};

export function StrategyModuleIntroPage({ module, onNavigate }: StrategyModuleIntroPageProps) {
  const m = MODULES[module];

  const accentText =
    m.accent === 'secondary' ? 'text-secondary' : m.accent === 'accent' ? 'text-accent' : 'text-primary';
  const accentBorder =
    m.accent === 'secondary' ? 'border-secondary/20' : m.accent === 'accent' ? 'border-accent/20' : 'border-primary/20';
  const accentBg =
    m.accent === 'secondary' ? 'from-secondary/10 via-secondary/6 to-primary/6' :
    m.accent === 'accent' ? 'from-accent/10 via-accent/6 to-primary/6' :
    'from-primary/10 via-primary/6 to-accent/6';

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={false} userType="visitor" onNavigate={(p: any) => onNavigate?.(p)} />

      <section className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1100px] mx-auto">
          <button
            onClick={() => onNavigate?.('home')}
            className="inline-flex items-center gap-2 text-[14px] text-muted-foreground/75 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </button>

          <div className={`mt-8 rounded-[28px] border ${accentBorder} bg-gradient-to-br ${accentBg} shadow-2xl shadow-primary/5 backdrop-blur-2xl backdrop-saturate-180 overflow-hidden`}>
            <div className="p-8 sm:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
                <div className={`w-16 h-16 rounded-[22px] bg-white/55 backdrop-blur-sm border border-white/60 flex items-center justify-center shadow-lg ${accentText}`}>
                  {m.icon}
                </div>
                <div>
                  <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-foreground">
                    {m.title}
                  </h1>
                  <p className="text-[14px] text-muted-foreground/65 mt-1">{m.en}</p>
                </div>
              </div>

              <div className="bg-white/65 backdrop-blur-sm rounded-[22px] p-7 sm:p-8 shadow-sm border border-white/60">
                <h2 className="font-semibold mb-3 text-[16px] text-foreground">{m.insightTitle}</h2>
                <p className="text-[15px] leading-relaxed text-muted-foreground/85">
                  {m.insight}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {m.stats.map((s) => (
                  <div
                    key={s.label}
                    className="bg-white/65 backdrop-blur-sm rounded-[18px] p-5 shadow-sm border border-white/60 hover:shadow-md transition-all duration-300"
                  >
                    <div className={`text-[32px] font-semibold mb-1 ${accentText}`}>{s.value}</div>
                    <div className="text-[12px] text-muted-foreground/60">{s.label}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={(p: any) => onNavigate?.(p)} />
    </div>
  );
}
