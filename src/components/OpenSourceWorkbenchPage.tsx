import { useState, useEffect, useRef, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  ArrowRight, Download, CheckCircle2, XCircle,
  BookOpen, Users, Handshake, Code, Lightbulb,
  ChevronRight, Compass,
  CheckSquare, Briefcase, Target, Newspaper,
  LayoutTemplate, Settings, Brain,
  Shield, TrendingUp, Gauge,
  GitBranch, Award,
  Database, RefreshCw, Github,
  Repeat2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OpenSourceWorkbenchPageProps {
  onNavigate?: (page: string) => void;
}

const IMG_BASE = `${import.meta.env.BASE_URL}images/workbench`;

// ---------------------------------------------------------------------------
// Interaction hooks
// ---------------------------------------------------------------------------

/** Scroll-triggered reveal with one-shot observer. */
function useScrollReveal(threshold = 0.08) {
  const [v, setV] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); obs.unobserve(e.target); } },
      { threshold, rootMargin: '0px 0px -60px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, isVisible: v };
}

/** Scroll-driven parallax offset (returns a px value for translateY). */
function useParallax(speed = 0.08) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const vCenter = window.innerHeight / 2;
        setOffset((center - vCenter) * speed);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [speed]);
  return { ref, offset };
}

/** 3D tilt + cursor glow on hover. */
function useTilt(maxDeg = 6) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const onMove = useCallback((e: ReactMouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;   // 0-1
    const y = (e.clientY - r.top) / r.height;
    const rotX = (0.5 - y) * maxDeg;
    const rotY = (x - 0.5) * maxDeg;
    setStyle({
      transform: `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.01,1.01,1.01)`,
      backgroundImage: `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(79,70,229,0.06) 0%, transparent 60%)`,
    });
  }, [maxDeg]);

  const onLeave = useCallback(() => {
    setStyle({ transform: 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)', backgroundImage: 'none' });
  }, []);

  return { ref, style, onMove, onLeave };
}

/** Counter that animates from 0 to target when visible. */
function AnimatedNumber({ value, suffix = '', duration = 1800 }: { value: number; suffix?: string; duration?: number }) {
  const { ref, isVisible } = useScrollReveal(0.5);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isVisible, value, duration]);
  return <span ref={ref}>{display}{suffix}</span>;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function FadeIn({ children, delay = 0, className = '', direction = 'up' }: {
  children: React.ReactNode; delay?: number; className?: string; direction?: 'up' | 'left' | 'right';
}) {
  const { ref, isVisible } = useScrollReveal();
  const tr = direction === 'left' ? '-translate-x-10' : direction === 'right' ? 'translate-x-10' : 'translate-y-10';
  return (
    <div ref={ref} className={`transition-all duration-[900ms] ease-out ${isVisible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${tr}`} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Tiltable card with cursor glow. */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, style, onMove, onLeave } = useTilt(5);
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={`transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={style}>
      {children}
    </div>
  );
}

/** App screenshot with macOS frame + parallax. */
function AppFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const { ref, offset } = useParallax(0.04);
  return (
    <div ref={ref} className={`bg-white rounded-[16px] shadow-strong ring-1 ring-border/30 overflow-hidden transition-shadow duration-500 hover:shadow-[0_20px_60px_-10px_rgba(79,70,229,0.15)] ${className}`}
      style={{ transform: `translateY(${offset}px)` }}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f6f6f6] border-b border-border/30">
        <div className="flex gap-1.5">
          <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F56]" />
          <div className="w-[10px] h-[10px] rounded-full bg-[#FFBD2E]" />
          <div className="w-[10px] h-[10px] rounded-full bg-[#27C93F]" />
        </div>
        <div className="ml-3 h-[6px] w-24 bg-border/30 rounded-full" />
      </div>
      <img src={src} alt={alt} className="w-full h-auto block" loading="lazy" />
    </div>
  );
}

/** Magnetic button — follows cursor slightly on hover. */
function MagneticButton({ children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: ReactMouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setOffset({ x: (e.clientX - cx) * 0.15, y: (e.clientY - cy) * 0.15 });
  }, []);

  return (
    <button ref={ref} onMouseMove={onMove} onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      {...rest}>
      {children}
    </button>
  );
}

// ===========================================================================
// 1. Hero
// ===========================================================================

function HeroSection() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24">
      <div className="text-center mb-12 lg:mb-16">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-[13px] font-semibold border border-primary/10 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
            免费开源 · 数据在本地 · 可自主部署
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.3rem] font-extrabold leading-[1.12] tracking-tight text-foreground mb-6">
            让团队每一次做事，<br />
            都在积累<span className="gradient-text">组织的判断力。</span>
          </h1>
        </FadeIn>

        <FadeIn delay={200}>
          <p className="text-[17px] text-muted-foreground leading-[1.75] max-w-2xl mx-auto mb-8">
            任务不只是完成就结束。每条任务背后的推进过程、每周复盘产生的判断证据、每次经验总结形成的方法卡——
            <strong className="text-foreground">都会沉淀下来，成为组织的资产。</strong>
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MagneticButton
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-7 py-3.5 rounded-full font-semibold text-[15px] shadow-glow-primary hover:shadow-glow-secondary active:scale-[0.97] group"
              onClick={() => window.open('https://github.com/guyuan9300/yiyu-thinktank-workbench', '_blank')}>
              <Github className="w-4 h-4" />
              查看源码
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
            <MagneticButton className="inline-flex items-center gap-2 bg-muted hover:bg-border text-foreground px-7 py-3.5 rounded-full font-semibold text-[15px] active:scale-[0.97]">
              <Download className="w-4 h-4" />
              免费下载 macOS 版
            </MagneticButton>
          </div>
        </FadeIn>

        {/* Animated stats */}
        <FadeIn delay={350}>
          <div className="flex items-center justify-center gap-8 pt-6 text-[13px] text-muted-foreground/60">
            <span><strong className="text-foreground text-[16px]"><AnimatedNumber value={7} /></strong> 个工作台</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span><strong className="text-foreground text-[16px]"><AnimatedNumber value={1} /></strong> 套对象模型</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>本地部署 + 云协作</span>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={400}>
        <AppFrame src={`${IMG_BASE}/tasks-overview.png`} alt="益语智库 — 任务与日程主界面" className="max-w-5xl mx-auto" />
      </FadeIn>
    </section>
  );
}

// ===========================================================================
// 2. 三个核心价值 — 截图 + TiltCard
// ===========================================================================

function ValueSection() {
  const values = [
    {
      icon: <GitBranch className="w-5 h-5" />,
      title: '同一件事跨三周推进，系统帮你记住全过程',
      desc: '你和客户讨论的方案调整，上周会议的决策，这周任务的进展——在一条"事件线"上自动串联。不需要翻记录，打开就看到全貌。',
      highlight: '事件线驱动的推进记忆，不是普通任务列表。',
      img: `${IMG_BASE}/task-list.png`,
      imgAlt: '任务列表 — 每条任务挂载事件线、项目模块',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: '周会不再凭感觉，系统帮你准备判断材料',
      desc: '每周复盘时，系统已经采集了本周的任务事实和事件线变化，生成"哪些风险在积累"、"哪些决策拖了太久"的结构化分析。',
      highlight: '基于证据的推理引擎，不是周报模板。',
      img: `${IMG_BASE}/weekly-review.png`,
      imgAlt: '周复盘 — 组织复盘事件线、成长复盘、AI 分析',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      icon: <Repeat2 className="w-5 h-5" />,
      title: '一个人学到的方法，全团队都能用上',
      desc: '张三做完一个项目总结了一套方法，写成方法卡。下次李四遇到类似问题，系统自动推荐这张卡。张三的经验变成了组织资产。',
      highlight: '经验的生产 → 流通 → 复用闭环。',
      img: `${IMG_BASE}/growth.png`,
      imgAlt: '成长手册 — XP 账本、能力雷达、心得复盘',
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold text-foreground tracking-tight leading-tight">
              做事的过程本身，就是组织变强的过程。
            </h2>
            <p className="mt-5 text-[17px] text-muted-foreground max-w-2xl mx-auto">
              三件传统工具做不到的事，这套系统天然支持。
            </p>
          </div>
        </FadeIn>

        <div className="space-y-20 lg:space-y-28">
          {values.map((item, i) => {
            const isReversed = i % 2 === 1;
            return (
              <div key={i} className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <FadeIn delay={0} direction={isReversed ? 'right' : 'left'} className={isReversed ? 'lg:order-2' : ''}>
                  <TiltCard>
                    <div className="p-1">
                      <div className={`w-11 h-11 rounded-[12px] ${item.color} flex items-center justify-center mb-5`}>
                        {item.icon}
                      </div>
                      <h3 className="text-[22px] lg:text-[26px] font-bold mb-4 text-foreground tracking-tight leading-snug">{item.title}</h3>
                      <p className="text-muted-foreground text-[16px] leading-[1.75] mb-6">{item.desc}</p>
                      <div className="text-[14px] text-primary font-semibold bg-primary/5 rounded-xl px-5 py-3.5 ring-1 ring-primary/10 inline-block">
                        {item.highlight}
                      </div>
                    </div>
                  </TiltCard>
                </FadeIn>

                <FadeIn delay={150} direction={isReversed ? 'left' : 'right'} className={isReversed ? 'lg:order-1' : ''}>
                  <AppFrame src={item.img} alt={item.imgAlt} />
                </FadeIn>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
// 3. AI 信任 — TiltCard + 战略截图
// ===========================================================================

function AiTrustSection() {
  return (
    <section className="py-24 lg:py-32 bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold text-foreground tracking-tight">
              AI 在这里不是黑盒。
            </h2>
            <p className="mt-5 text-[17px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              很多决策者对 AI 的顾虑不是"不够聪明"，而是"不知道它凭什么这么说"。
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: <Shield className="w-6 h-6" />, title: '每条建议，都说清楚依据', desc: '系统为每条 AI 判断维护"证据清单"——参考了哪些任务事实、会议纪要、项目背景。来源可查。', color: 'text-primary bg-primary/5' },
            { icon: <Gauge className="w-6 h-6" />, title: '信息不够，就说"我不确定"', desc: '证据不充分时不会硬编答案。自动降级为摘要模式，告诉你"需要补充什么信息"。', color: 'text-amber-600 bg-amber-50' },
            { icon: <CheckCircle2 className="w-6 h-6" />, title: '重要判断，人确认才发布', desc: '战略判断草案、周会材料、风险预警——AI 生成后是"草案"。负责人确认后才变"正式"。', color: 'text-emerald-600 bg-emerald-50' },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 100}>
              <TiltCard className="h-full">
                <div className="h-full bg-white/80 backdrop-blur-sm border border-border/40 rounded-[24px] p-7 hover:shadow-soft transition-shadow duration-500">
                  <div className={`w-12 h-12 rounded-[14px] ${item.color} flex items-center justify-center mb-5`}>
                    {item.icon}
                  </div>
                  <h3 className="text-[17px] font-bold mb-2 text-foreground tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground text-[14px] leading-[1.7]">{item.desc}</p>
                </div>
              </TiltCard>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={200}>
          <div className="text-center mb-5">
            <p className="text-[14px] text-muted-foreground">
              <strong className="text-foreground">战略陪伴页面</strong>：经营判断草案、本周聚焦、待决策清单——每条结论标注状态和来源。
            </p>
          </div>
          <AppFrame src={`${IMG_BASE}/strategic.png`} alt="战略陪伴 — 经营判断、组织健康、证据底稿" className="max-w-5xl mx-auto" />
        </FadeIn>
      </div>
    </section>
  );
}

// ===========================================================================
// 4. 七个工作台 — Tab 切换 + 截图过渡动画
// ===========================================================================

const MODULE_SCREENSHOTS = [
  { icon: CheckSquare, title: '任务与日程', desc: '协作收件箱 · 事件线挂载 · 内部月历 · 周复盘', img: 'tasks-overview', color: 'text-blue-600 bg-blue-50', status: '已完成' },
  { icon: Briefcase, title: '客户工作台', desc: '资料导入 → 知识库 · 项目问答 · 会议流 · DNA', img: 'client-workspace', color: 'text-purple-600 bg-purple-50', status: '部分完成' },
  { icon: Target, title: '战略陪伴', desc: '经营判断 · 健康五维 · 周会清单 · 证据底稿', img: 'strategic', color: 'text-amber-600 bg-amber-50', status: '部分完成' },
  { icon: Newspaper, title: '资讯情报站', desc: '雷达监控 → 洞察提炼 → 转任务 · 全链路', img: 'topics', color: 'text-emerald-600 bg-emerald-50', status: '已完成' },
  { icon: LayoutTemplate, title: '测试工作台', desc: '诊断模板 · 筹款分析 · 风险 DNA · 学习沉淀', img: 'workbench', color: 'text-rose-600 bg-rose-50', status: '部分完成' },
  { icon: BookOpen, title: '成长手册', desc: 'XP 账本 · 六维能力 · 方法卡 · 学习推荐', img: 'growth', color: 'text-indigo-600 bg-indigo-50', status: '部分完成' },
  { icon: Settings, title: '系统设置', desc: '组织搭建 · 模块规则 · 飞书集成 · 品牌更新', img: 'settings', color: 'text-stone-600 bg-stone-100', status: '已完成' },
];

function ModulesSection() {
  const [active, setActive] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const mod = MODULE_SCREENSHOTS[active];

  const switchTab = (idx: number) => {
    if (idx === active) return;
    setTransitioning(true);
    setTimeout(() => { setActive(idx); setTransitioning(false); }, 250);
  };

  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-5">
              七个工作台，数据自然流动。
            </h2>
            <p className="text-[17px] text-muted-foreground max-w-2xl mx-auto">
              不是七个独立工具拼在一起。任务产生事件线 → 事件线喂周复盘 → 复盘结果进战略判断 → 判断中的成长信号进能力账本。
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {MODULE_SCREENSHOTS.map((m, i) => {
              const Icon = m.icon;
              const isActive = i === active;
              return (
                <button key={i} onClick={() => switchTab(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-300
                    ${isActive ? 'bg-foreground text-white shadow-medium scale-105' : 'bg-white border border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[1.03]'}`}>
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{m.title}</span>
                </button>
              );
            })}
          </div>

          <div className="text-center mb-6 h-8 flex items-center justify-center">
            <span className={`text-[15px] text-muted-foreground transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>{mod.desc}</span>
            <span className={`ml-3 text-[11px] px-2 py-0.5 rounded-full font-medium transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'} ${
              mod.status === '已完成' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>{mod.status}</span>
          </div>

          {/* Screenshot with crossfade */}
          <div className="max-w-5xl mx-auto">
            <div className={`transition-all duration-300 ease-out ${transitioning ? 'opacity-0 scale-[0.97] blur-[2px]' : 'opacity-100 scale-100 blur-0'}`}>
              <AppFrame src={`${IMG_BASE}/${mod.img}.png`} alt={`${mod.title}界面`} />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ===========================================================================
// 5. 细节截图 — Hover zoom + TiltCard
// ===========================================================================

function DetailScreenshotsSection() {
  return (
    <section className="py-24 lg:py-32 bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-foreground tracking-tight mb-5">
            深入每个工作台。
          </h2>
          <p className="text-center text-[17px] text-muted-foreground mb-16 max-w-2xl mx-auto">
            不只看主页面——这些是日常使用频率最高的子视图。
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            { img: 'task-calendar', title: '内部月历', desc: '任务按时间排布在日历上，支持拖拽排期。彩色标签区分优先级和所属项目。' },
            { img: 'client-workspace', title: '客户工作台', desc: '把客户资料导入后，系统建立知识库。在项目上下文中问答、会议抽取、模板填充。' },
            { img: 'topics', title: '资讯情报站', desc: '设定雷达主题后，系统自动抓取候选资讯。AI 提炼核心观点，一键转化为任务。' },
            { img: 'settings', title: '系统设置', desc: '组织搭建、模块规则、AI 配置、飞书绑定——整个系统的治理后台，不只是偏好设置。' },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 80}>
              <TiltCard className="h-full">
                <div className="bg-white/80 backdrop-blur-sm border border-border/40 rounded-[24px] overflow-hidden hover:shadow-medium transition-shadow duration-500 h-full group">
                  <div className="overflow-hidden">
                    <img src={`${IMG_BASE}/${item.img}.png`} alt={item.title}
                      className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.03]" loading="lazy" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-[17px] font-bold text-foreground mb-1.5">{item.title}</h3>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </TiltCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
// 6. 使用旅程 — 渐进式 timeline
// ===========================================================================

function JourneySection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-5 text-foreground tracking-tight">
            一个 10 人团队的真实使用场景。
          </h2>
          <p className="text-center text-[17px] text-muted-foreground mb-16 max-w-2xl mx-auto">
            从第一周到第八周，系统的价值逐步显现。
          </p>
        </FadeIn>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="hidden md:block absolute left-[27px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-blue-200 via-amber-200 to-rose-200" />

          <div className="space-y-4">
            {[
              { week: '第 1 周', title: '导入资料，搭建组织骨架', desc: '把客户背景、组织介绍、历史方案导入系统。填写组织 DNA 四卡。系统开始建立项目知识库。', icon: Database, color: 'bg-blue-500' },
              { week: '第 2–3 周', title: '日常推任务，事件线自动形成', desc: '团队在任务列表里正常工作。系统自动把相关任务串成事件线——不需要手动维护。', icon: CheckSquare, color: 'bg-purple-500' },
              { week: '第 4 周', title: '第一次 AI 辅助周复盘', desc: '周五打开复盘页，系统已经采集了本周事实。生成叙事分析："本周有 3 条事件线推进顺利，1 条出现决策滞后风险"。', icon: Brain, color: 'bg-amber-500' },
              { week: '第 5–6 周', title: '战略驾驶舱开始输出判断', desc: '事件线数据足够后，战略陪伴页自动生成经营判断草案。管理者确认或修改后发布，形成组织决策记录。', icon: Target, color: 'bg-emerald-500' },
              { week: '第 8 周', title: '经验开始复用，成长可量化', desc: '有人把项目经验总结成方法卡。新同事接类似项目时，系统自动推荐。团队六维能力雷达图开始有变化。', icon: Award, color: 'bg-rose-500' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={i} delay={i * 100}>
                  <div className="flex items-start gap-5 bg-white/80 backdrop-blur-sm border border-border/40 rounded-[20px] px-6 py-5 hover:shadow-soft hover:-translate-y-0.5 transition-all duration-500 relative md:ml-[14px]">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-white shrink-0 mt-0.5 relative z-10 ring-4 ring-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[12px] font-bold text-primary">{item.week}</span>
                        <h3 className="text-[16px] font-bold text-foreground">{item.title}</h3>
                      </div>
                      <p className="text-[14px] text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
// 7. 适合谁 / 不适合谁 — TiltCard
// ===========================================================================

function PositioningSection() {
  return (
    <section className="py-24 lg:py-32 bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-foreground tracking-tight mb-16">
            帮你快速判断：这个软件适不适合你。
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6">
          <FadeIn delay={100}>
            <TiltCard className="h-full">
              <div className="h-full bg-white/80 backdrop-blur-sm border border-border/40 p-10 rounded-[24px]">
                <h3 className="text-[24px] font-extrabold text-foreground mb-8">适合的团队</h3>
                <ul className="space-y-5">
                  {['10–50 人的团队，需要协作但不想上重型 ERP', '每周有例会，但苦于没有结构化的复盘材料', '做项目交付或客户服务，需要持续积累项目知识', '想让 AI 辅助判断，但要求数据可控、逻辑可查', '重视团队成长，希望经验不因人员流动而丢失'].map((item, i) => (
                    <li key={i} className="flex gap-3 text-[15px] text-foreground/80 items-start">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TiltCard>
          </FadeIn>

          <FadeIn delay={200}>
            <TiltCard className="h-full">
              <div className="h-full bg-muted p-10 rounded-[24px]">
                <h3 className="text-[24px] font-extrabold text-muted-foreground mb-8">目前还不适合的场景</h3>
                <ul className="space-y-5">
                  {['只需要个人待办清单，不涉及团队协作', '需要细粒度多人实时文档协作（类似 Google Docs）', '需要外部日历双向同步（Google / Outlook）', '纯粹想要一个聊天机器人——这不是对话工具', '超过 200 人的大型组织——目前为中小团队设计'].map((item, i) => (
                    <li key={i} className="flex gap-3 text-[15px] text-muted-foreground items-start">
                      <XCircle className="w-5 h-5 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TiltCard>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
// 8. 开源 + 技术栈 — TiltCard
// ===========================================================================

function OpenSourceSection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
              开源不是情怀。<br />
              <span className="text-muted-foreground font-semibold">是让你敢用的前提。</span>
            </h2>
            <p className="mt-5 text-[17px] text-muted-foreground max-w-2xl mx-auto">
              数据存在你自己的电脑上。AI 的每一行推理逻辑都能在源码里查到。
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <FadeIn delay={100}>
            <TiltCard className="h-full">
              <div className="bg-white/80 backdrop-blur-sm border border-border/40 rounded-[24px] p-8 h-full">
                <h3 className="text-[18px] font-bold text-foreground mb-6">技术栈</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '桌面端', tech: 'Electron + React' },
                    { label: '本地后端', tech: 'Python FastAPI' },
                    { label: '云协作', tech: 'FastAPI + PostgreSQL' },
                    { label: 'AI 引擎', tech: 'Qwen 3.5（可替换）' },
                  ].map((item, i) => (
                    <div key={i} className="bg-background rounded-xl px-4 py-3 ring-1 ring-border/20">
                      <div className="text-[11px] text-primary font-bold mb-0.5">{item.label}</div>
                      <div className="text-[13px] font-bold text-foreground">{item.tech}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </FadeIn>

          <FadeIn delay={200}>
            <TiltCard className="h-full">
              <div className="bg-white/80 backdrop-blur-sm border border-border/40 rounded-[24px] p-8 h-full">
                <h3 className="text-[18px] font-bold text-foreground mb-6">四种参与方式</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Code, title: '开发者', desc: '架构、模块、修复', color: 'bg-blue-50 text-blue-600' },
                    { icon: Compass, title: '产品共建', desc: '场景反馈、交互设计', color: 'bg-purple-50 text-purple-600' },
                    { icon: Lightbulb, title: '知识贡献', desc: '方法卡、行业经验', color: 'bg-amber-50 text-amber-600' },
                    { icon: Handshake, title: '机构合作', desc: '部署、定制、培训', color: 'bg-emerald-50 text-emerald-600' },
                  ].map((role, i) => {
                    const Icon = role.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 group cursor-default">
                        <div className={`w-10 h-10 ${role.color} rounded-[10px] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-foreground">{role.title}</div>
                          <div className="text-[11px] text-muted-foreground">{role.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TiltCard>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
// 9. CTA — Magnetic buttons
// ===========================================================================

function CtaSection() {
  return (
    <section className="py-32 lg:py-40 text-center bg-background relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[100px] animate-pulse-soft" />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 relative z-10">
        <FadeIn>
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-7 tracking-tighter text-foreground">
            让做事的过程，<br />
            变成组织变强的过程。
          </h2>
          <p className="text-[18px] text-muted-foreground mb-12 leading-relaxed">
            下载到本地，数据在你自己手上。<br />
            <span className="text-muted-foreground/50">免费、开源、不被锁定。</span>
          </p>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <MagneticButton className="bg-foreground hover:bg-foreground/90 text-white px-9 py-4 rounded-full font-semibold text-[16px] shadow-medium active:scale-[0.97]">
              免费下载 macOS 版
            </MagneticButton>
            <MagneticButton
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-muted text-foreground px-9 py-4 rounded-full font-semibold text-[16px] ring-1 ring-border/40 active:scale-[0.97]"
              onClick={() => window.open('https://github.com/guyuan9300/yiyu-thinktank-workbench', '_blank')}>
              <Github className="w-4 h-4" />
              查看完整源码
            </MagneticButton>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ===========================================================================
// Scroll progress bar
// ===========================================================================

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-50">
      <div className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

// ===========================================================================
// Root
// ===========================================================================

export function OpenSourceWorkbenchPage({ onNavigate }: OpenSourceWorkbenchPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      <ScrollProgress />
      <Header onNavigate={onNavigate} />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-8%] w-[50%] h-[50%] bg-primary opacity-[0.015] blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[-15%] w-[40%] h-[40%] bg-accent opacity-[0.01] blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 pt-20 lg:pt-28">
        <HeroSection />
        <ValueSection />
        <AiTrustSection />
        <ModulesSection />
        <DetailScreenshotsSection />
        <JourneySection />
        <PositioningSection />
        <OpenSourceSection />
        <CtaSection />
      </div>

      <Footer onNavigate={onNavigate as any} />
    </div>
  );
}
