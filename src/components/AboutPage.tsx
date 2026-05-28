import { ArrowRight, BookOpen, Mail, Phone, QrCode, TrendingUp, Users, Zap } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  SITE_CONTACT_EMAIL,
  SITE_CONTACT_PHONE,
  SITE_WECHAT_OFFICIAL,
} from '../lib/siteMeta';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';

interface AboutPageProps {
  // strategy/insights/learning 路由将在 Step 10 清理后从 union 中移除;暂保留兼容
  onNavigate?: (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register' | 'consult-apply' | 'articles' | 'reports') => void;
}

const coreValues = [
  {
    icon: TrendingUp,
    title: '结果导向',
    description: '我们关心的不只是报告本身，而是建议是否真正落到组织日常、带来可感知的变化。',
  },
  {
    icon: Users,
    title: '长期陪伴',
    description: '战略不是一次会议，而是一段持续推进的过程。我们更重视陪伴推进，而不是一次性交付。',
  },
  {
    icon: Zap,
    title: '专业深度',
    description: '围绕公益与组织发展场景，持续沉淀行业研究、方法工具和 AI 时代的协作实践。',
  },
  {
    icon: BookOpen,
    title: '知识资产化',
    description: '把零散经验、项目方法和团队判断沉淀成可复用、可传递的知识资产。',
  },
];

const services = [
  {
    title: '战略路径清晰化',
    description: '帮助组织明确方向、对齐共识，并把战略拆成真正能推进的阶段目标与行动节奏。',
  },
  {
    title: '组织效能重构',
    description: '围绕组织分工、协作方式、管理机制与节奏设计，提升团队把事情做成的能力。',
  },
  {
    title: '数字化与 AI 落地赋能',
    description: '把数字化和 AI 从概念、工具，变成团队能够稳定使用的工作流和组织能力。',
  },
];

const milestones = [
  {
    year: '2020',
    title: '问题意识形成',
    description: '在咨询与陪伴实践中，我们不断看到组织“知道方向，却推不动”的共同难题。',
  },
  {
    year: '2021',
    title: '方法论沉淀',
    description: '围绕战略推进、组织协作与项目复盘，逐步形成益语自己的陪伴式方法框架。',
  },
  {
    year: '2023',
    title: '知识产品化',
    description: '开始把报告、文章、方法论与书籍沉淀到统一平台，形成可复用的知识资产。',
  },
  {
    year: '2025',
    title: 'AI 协同升级',
    description: '围绕内容沉淀、知识调用和组织协作，探索 AI 驱动的新型战略工作流。',
  },
];

export function AboutPage({ onNavigate }: AboutPageProps) {
  const handleNavigate = (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register' | 'consult-apply' | 'articles' | 'reports') => {
    onNavigate?.(page);
  };

  return (
    <div {...getYiyuPageAttrs('about')} className="min-h-screen bg-background">
      <Header isLoggedIn={false} userType="visitor" onNavigate={(page) => handleNavigate(page as any)} />

      <section
        {...getYiyuSectionAttrs('about', 'about-hero')}
        className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-os-canvas"
      >
        {/* 极淡光晕,与 ArticleCenterPage/ReportLibraryPage hero 同语言 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[8%] w-[40%] h-[60%] rounded-full bg-os-navy/[0.05] blur-[120px]" />
          <div className="absolute top-[-10%] right-[10%] w-[35%] h-[55%] rounded-full bg-os-spark/[0.05] blur-[120px]" />
        </div>

        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* eyebrow 与发丝线 */}
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <span className="h-px w-7 bg-os-blue/70" />
              <span className="text-[12px] font-semibold tracking-[0.2em] text-os-blue">关于益语智库</span>
              <span className="h-px w-7 bg-os-blue/70" />
            </div>

            <h1 className="font-serif-display text-[40px] sm:text-[56px] md:text-[64px] font-semibold leading-[1.15] tracking-tight mb-6 text-os-ink">
              让战略落到地上
              <br />
              <span className="text-ink-accent">让组织持续增长</span>
            </h1>

            <p className="text-[16px] sm:text-[19px] text-os-muted mb-10 max-w-3xl mx-auto leading-[1.85]">
              益语智库是一家把战略思想做成 AI 工具的组织陪伴公司。我们看到组织经营是一个整体,但今天所有工具都把它切碎了——
              所以我们用 AI 和工作系统,把多年战略咨询沉淀的思想承载下来,作为持续陪伴客户的一种新方式。
            </p>

            {/* 单一主 CTA: 免费预约组织诊断 (strategy 页已砍, 申请咨询是主转化漏斗) */}
            <div className="flex items-center justify-center">
              <button
                onClick={() => handleNavigate('consult-apply')}
                className="group px-8 py-4 rounded-full bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 transition-all duration-300 hover:scale-[1.02] shadow-os flex items-center gap-2"
              >
                <span className="font-semibold text-[15px]">免费预约组织诊断</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        {...getYiyuSectionAttrs('about', 'about-values')}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-muted/5"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">核心价值观</h2>
            <p className="text-[14px] text-muted-foreground/60">这是我们做研究、做产品、做陪伴时的一致工作方式。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {coreValues.map((item) => (
              <div
                key={item.title}
                className="bg-white/80 backdrop-blur-sm rounded-[24px] p-7 border border-border/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-[18px] font-semibold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground/70 leading-relaxed text-[14px]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        {...getYiyuSectionAttrs('about', 'about-services')}
        className="py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">服务内容</h2>
            <p className="text-[14px] text-muted-foreground/60">围绕战略、组织与 AI 落地，形成三条主要服务线。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service) => (
              <div key={service.title} className="bg-white/80 backdrop-blur-sm rounded-[24px] p-7 border border-border/40">
                <h3 className="text-[18px] font-semibold mb-3 text-foreground">{service.title}</h3>
                <p className="text-muted-foreground/70 text-[14px] leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        {...getYiyuSectionAttrs('about', 'about-milestones')}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-muted/5"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">发展历程</h2>
            <p className="text-[14px] text-muted-foreground/60">从实践问题出发，持续沉淀成今天的知识服务与战略陪伴框架。</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-5">
            {milestones.map((item) => (
              <div key={item.year} className="bg-white/80 backdrop-blur-sm rounded-[20px] p-6 border border-border/40">
                <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 text-primary text-[12px] font-medium mb-3">
                  {item.year}
                </span>
                <h3 className="text-[16px] font-semibold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground/70 text-[13px] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        {...getYiyuSectionAttrs('about', 'about-contact')}
        className="py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">联系我们</h2>
            <p className="text-[14px] text-muted-foreground/60">欢迎通过以下方式联系，我们也提供免费的组织诊断预约入口。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <a
                href={`tel:${SITE_CONTACT_PHONE}`}
                data-yiyu-contact="phone"
                className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-[18px] border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-[12px] bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground/60 mb-0.5">联系电话</p>
                  <p className="font-medium text-[14px] text-foreground group-hover:text-primary transition-colors">{SITE_CONTACT_PHONE}</p>
                </div>
              </a>

              <a
                href={`mailto:${SITE_CONTACT_EMAIL}`}
                data-yiyu-contact="email"
                className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-[18px] border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-[12px] bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground/60 mb-0.5">联系邮箱</p>
                  <p className="font-medium text-[14px] text-foreground group-hover:text-primary transition-colors">{SITE_CONTACT_EMAIL}</p>
                </div>
              </a>

              <div
                data-yiyu-contact="wechat"
                className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-[18px] border border-border/40"
              >
                <div className="w-11 h-11 rounded-[12px] bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground/60 mb-0.5">微信公众号</p>
                  <p className="font-medium text-[14px] text-foreground">{SITE_WECHAT_OFFICIAL}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-8 border border-border/40 flex flex-col justify-between">
              <div>
                <h3 className="text-[22px] font-semibold mb-3 text-foreground">免费预约组织诊断</h3>
                <p className="text-[14px] text-muted-foreground/70 leading-relaxed">
                  如果你正在梳理组织方向、推进战略落地，或希望评估团队协作与管理机制，我们可以先从一次轻量诊断开始。
                </p>
              </div>

              <button
                data-yiyu-cta="consult-diagnosis"
                onClick={() => handleNavigate('consult-apply')}
                className="mt-8 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
              >
                <span className="font-medium text-[15px]">前往预约</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={(page) => handleNavigate(page as any)} />
    </div>
  );
}

export default AboutPage;
