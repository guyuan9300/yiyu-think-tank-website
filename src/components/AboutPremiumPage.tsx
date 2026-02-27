import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Shield, Sparkles, Crown, ChevronRight } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';

interface AboutPremiumPageProps {
  onNavigate?: (page: string) => void;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/8 text-primary text-[12px] font-medium border border-primary/15">
      {children}
    </span>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-border/40 p-6 hover:border-primary/35 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-[13px] text-muted-foreground/75 leading-relaxed">{desc}</div>
        </div>
      </div>
    </div>
  );
}

export function AboutPremiumPage({ onNavigate }: AboutPremiumPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUserStatus = () => {
      const userStr = (localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user'));
      setIsLoggedIn(Boolean(userStr));
    };
    checkUserStatus();
    window.addEventListener('yiyu_user_updated', checkUserStatus);
    window.addEventListener('storage', checkUserStatus);
    return () => {
      window.removeEventListener('yiyu_user_updated', checkUserStatus);
      window.removeEventListener('storage', checkUserStatus);
    };
  }, []);

  const tiers = useMemo(() => {
    return [
      {
        name: '普通会员',
        tag: '适合个人学习',
        price: '¥—',
        items: ['浏览公开内容', '收藏与点赞（本机）', '评论（需审核）'],
      },
      {
        name: '黄金会员',
        tag: '适合系统进阶',
        price: '¥—',
        items: ['报告与书籍下载权限', '更高频内容更新', '专属活动/课程（建设中）'],
      },
      {
        name: '钻石会员',
        tag: '适合机构与深度合作',
        price: '¥—',
        items: ['战略陪伴入口', '专属资源包', '优先支持与服务'],
      },
    ];
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header isLoggedIn={isLoggedIn} userType={isLoggedIn ? 'member' : 'visitor'} onNavigate={(p) => onNavigate?.(p)} />

      {/* Hero */}
      <section className="relative pt-28 sm:pt-32 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.035] via-background to-background" />
        <div className="absolute -top-20 -right-24 w-[420px] h-[420px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] bg-accent/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground/60 mb-6">
            <button
              type="button"
              onClick={() => onNavigate?.('home')}
              className="hover:text-foreground transition-colors"
            >
              首页
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">高端介绍页</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Pill>
              <Crown className="w-4 h-4 mr-1" />
              Premium
            </Pill>
            <Pill>
              <Shield className="w-4 h-4 mr-1" />
              宁静 · 高级 · 国际化
            </Pill>
          </div>

          <h1 className="text-[34px] sm:text-[54px] font-semibold leading-[1.08] tracking-tight text-foreground">
            yiyu-about-premium
          </h1>
          <p className="mt-4 text-[16px] sm:text-[18px] text-muted-foreground/80 leading-relaxed">
            这是一个独立页面骨架（静态版）。等你把文件（PPT/PDF/文档）附件发我后，我会把文案与结构逐段对齐并替换成最终内容。
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => onNavigate?.('register')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              了解会员体系
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('about')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white/70 border border-border/40 hover:bg-white transition-all"
            >
              返回关于我们
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Feature title="价值主张（占位）" desc="用一句话说清楚高端服务的核心价值与适用人群。" />
            <Feature title="交付物（占位）" desc="列出 3-5 个可交付产物，例如：方向画布、北极星指标、业务模型、行动路线图等。" />
            <Feature title="方法（占位）" desc="说明方法论：诊断—共创—落地—复盘。强调节奏、边界、输出。" />
            <Feature title="案例（占位）" desc="放 1-3 个简短案例卡片（不需要大段）。" />
          </div>

          {/* Tier grid */}
          <div className="mt-12">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <div className="text-[18px] font-semibold text-foreground">会员层级（占位）</div>
                <div className="text-[13px] text-muted-foreground/70 mt-1">最终以你发的文件为准，我再把文案一字不差对齐。</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {tiers.map((t) => (
                <div key={t.name} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-border/40 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[16px] font-semibold text-foreground">{t.name}</div>
                      <div className="text-[12px] text-muted-foreground/70 mt-1">{t.tag}</div>
                    </div>
                    <div className="text-[14px] font-semibold text-primary">{t.price}</div>
                  </div>
                  <ul className="mt-5 space-y-2 text-[13px] text-muted-foreground/80">
                    {t.items.map((x) => (
                      <li key={x} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/60" />
                        <span className="leading-relaxed">{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 p-6 rounded-2xl border border-border/40 bg-gradient-to-br from-primary/6 via-background to-accent/6">
            <div className="text-[15px] font-semibold text-foreground">下一步</div>
            <div className="mt-2 text-[13px] text-muted-foreground/80 leading-relaxed">
              你把 <span className="text-foreground font-medium">yiyu-about-premium</span> 的文件作为飞书附件发我（或给云文档分享链接），我会：
              <br />
              1）把页面内容按文件逐段对齐替换；2）补齐视觉细节（间距/字号/卡位）；3）把跳转入口加到你指定的位置。
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}

export default AboutPremiumPage;
