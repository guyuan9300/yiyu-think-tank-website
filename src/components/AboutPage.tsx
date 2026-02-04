import { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { ArrowRight, Users, Target, Zap, BookOpen, Phone, Mail, MapPin, Calendar, Play, TrendingUp, ChevronRight } from 'lucide-react';
import { getSystemSettings, type SystemSettings } from '../lib/dataService';

interface AboutPageProps {
  onNavigate?: (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register') => void;
}

// Animated number counter component
function AnimatedNumber({ value, duration = 2000 }: { value: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState('0');
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || value === '0') return;

    const numValue = parseInt(value.replace(/[^0-9]/g, ''));
    const suffix = value.replace(/[0-9]/g, '');
    const duration_ms = duration;
    const steps = 60;
    const increment = numValue / steps;
    const stepDuration = duration_ms / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numValue) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current).toLocaleString() + suffix);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isVisible, value, duration]);

  return <span ref={ref}>{displayValue}</span>;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const loadSettings = () => {
      setSettings(getSystemSettings());
    };

    loadSettings();

    const handleDataChange = () => {
      loadSettings();
    };

    window.addEventListener('yiyu_data_change', handleDataChange);

    return () => {
      window.removeEventListener('yiyu_data_change', handleDataChange);
    };
  }, []);

  const coreValues = [
    {
      icon: Target,
      title: '结果导向',
      description: '我们相信企业真正需要的不是报告，而是结果。每一个建议、每一份方案都指向可执行、可衡量的成果。'
    },
    {
      icon: Users,
      title: '长期陪伴',
      description: '战略落地需要时间。我们不是一次性咨询顾问，而是企业成长的长期伙伴，陪伴从规划到执行的全过程。'
    },
    {
      icon: Zap,
      title: '专业深度',
      description: '基于深度行业研究和丰富实战经验，提供前瞻性、可落地的战略建议，而非泛泛的通用模板。'
    },
    {
      icon: BookOpen,
      title: '知识资产化',
      description: '帮助企业将隐性知识显性化，将零散经验系统化，让知识真正成为可复用、可传承的资产。'
    }
  ];

  const services = [
    {
      category: '战略路径清晰化',
      description: '从模糊方向到清晰路径，把战略变成可执行的行动地图',
      features: ['战略工作坊', 'OKR制定与落地', '季度复盘与调整', '战略沟通与共识'],
      icon: TrendingUp,
      color: 'from-primary/20 to-primary/5'
    },
    {
      category: '组织效能重构',
      description: '从组织诊断到效能提升，让组织成为战略落地的引擎',
      features: ['组织效能评估', '人才盘点与发展', '流程优化再造', '文化与协作机制'],
      icon: Users,
      color: 'from-secondary/20 to-secondary/5'
    },
    {
      category: '数字化与AI落地赋能',
      description: '从技术引入到能力内化，让数字化真正驱动业务增长',
      features: ['数字化战略规划', 'AI工具选型与落地', '组织学习能力建设', '知识管理体系'],
      icon: Zap,
      color: 'from-accent/20 to-accent/5'
    }
  ];

  const milestones = [
    { year: '2020', title: '初心萌发', description: '创始团队在管理咨询实践中，发现企业普遍面临"知道但做不到"的困境，决定打造一个让战略真正落地的平台。' },
    { year: '2021', title: '方法论沉淀', description: '基于50+企业服务经验，提炼出"战略陪伴"方法论，形成独特的服务模式和工具体系。' },
    { year: '2023', title: '产品化升级', description: '益语智库平台上线，将咨询方法论转化为可复用的工具、模板和知识产品，让更多企业受益。' },
    { year: '2025', title: 'AI赋能', description: '引入AI技术，打造"同屏学习+AI讨论"的全新体验，让知识获取更高效、更个性化。' }
  ];

  const teamMembers = settings?.teamMembers && settings.teamMembers.length > 0 
    ? settings.teamMembers.map(member => ({
        role: member.role,
        name: member.name,
        bio: member.bio || '',
        expertise: []
      }))
    : [
        {
          role: '创始人 & 首席战略顾问',
          name: '张明',
          bio: '前麦肯锡项目经理，15年战略咨询经验，服务过100+企业，专注于战略规划与组织变革。',
          expertise: ['战略规划', '组织变革', '数字化转型']
        },
        {
          role: '联合创始人 & 首席产品官',
          name: '李华',
          bio: '前字节跳动产品总监，深耕企业服务领域，致力于将咨询方法论产品化，让更多企业受益。',
          expertise: ['产品设计', '知识管理', 'AI应用']
        },
        {
          role: '合伙人 & 首席技术官',
          name: '王强',
          bio: '前阿里技术专家，专注于企业级应用开发和AI技术应用，打造益语智库的技术基础设施。',
          expertise: ['技术架构', 'AI工程', '数据平台']
        }
      ];

  const contactInfo = [
    { 
      icon: Phone, 
      label: '咨询热线', 
      value: settings?.contactPhone || '400-888-8888', 
      href: `tel:${settings?.contactPhone || '4008888888'}` 
    },
    { 
      icon: Mail, 
      label: '商务合作', 
      value: settings?.contactEmail || 'contact@yiyu.think', 
      href: `mailto:${settings?.contactEmail || 'contact@yiyu.think'}` 
    },
    { 
      icon: MapPin, 
      label: '办公地址', 
      value: '北京市朝阳区建国路88号SOHO现代城A座', 
      href: '#' 
    },
    { 
      icon: Calendar, 
      label: '服务时间', 
      value: '周一至周五 9:00-18:00', 
      href: '#' 
    }
  ];

  const stats = [
    { number: '200+', label: '服务企业' },
    { number: '500+', label: '深度报告' },
    { number: '50+', label: '专家资源' },
    { number: '98%', label: '客户满意度' },
    { number: '15年+', label: '平均经验' },
    { number: '3大', label: '核心模块' }
  ];

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page as 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={false} userType="visitor" onNavigate={handleNavigate} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-accent/4" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <p className="text-[13px] font-medium text-muted-foreground/70 tracking-[0.15em] uppercase mb-6">
              关于益语智库
            </p>
            
            <h1 className="text-[44px] sm:text-[56px] md:text-[64px] font-semibold leading-tight tracking-tight mb-6 text-foreground">
              让战略落到地上
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                让组织持续增长
              </span>
            </h1>
            
            <p className="text-[17px] sm:text-[19px] text-muted-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              益语智库是新一代战略陪伴与知识服务平台，通过深度洞察、系统方法和AI赋能，帮助企业将战略转化为行动，让增长持续发生。
            </p>
            
            <p className="text-[13px] text-muted-foreground/50 tracking-[0.08em] mb-10">
              Yiyu Think Tank - Your Strategic Companion for Sustainable Growth
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => handleNavigate('strategy')}
                className="group px-8 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25 flex items-center gap-2"
              >
                <span className="font-medium text-[15px]">了解更多服务</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button className="group px-8 py-4 rounded-full border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 ease-out hover:scale-[1.02] flex items-center gap-2">
                <Play className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                <span className="font-medium text-[15px]">观看介绍视频</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-muted/5">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-[28px] sm:text-[32px] font-semibold text-foreground mb-2 tracking-tight">
                  <AnimatedNumber value={stat.number} duration={1500 + index * 200} />
                </div>
                <div className="text-[13px] text-muted-foreground/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">
              我们的使命
            </h2>
            <p className="text-[15px] text-muted-foreground/70">
              助力企业持续增长的战略陪伴者
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left: What We Believe */}
            <div>
              <h3 className="text-[20px] font-semibold mb-5 text-foreground">我们相信</h3>
              <p className="text-muted-foreground/80 mb-5 leading-relaxed text-[15px]">
                企业真正需要的，不是厚重的报告，而是可落地的方案；不是一次性的咨询，而是长期的战略陪伴。
              </p>
              <p className="text-muted-foreground/80 mb-8 leading-relaxed text-[15px]">
                在这个充满不确定性的时代，企业需要的不仅是方向，更是将方向转化为行动的能力；不仅是知识，更是将知识转化为资产的体系。
              </p>
              
              <div className="inline-flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-[16px] border border-border/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer">
                <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-lg">益</span>
                </div>
                <div>
                  <h4 className="font-medium text-[14px] text-foreground">益语智库的由来</h4>
                  <p className="text-[12px] text-muted-foreground/60">"益"取自"增益"——帮助企业持续增益</p>
                </div>
              </div>
            </div>
            
            {/* Right: What We Do */}
            <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-8 border border-border/40">
              <h3 className="text-[20px] font-semibold mb-6 text-foreground">我们做什么</h3>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[15px] mb-1 text-foreground">深度洞察</h4>
                    <p className="text-[13px] text-muted-foreground/70">基于行业深度研究，提供前瞻性战略建议</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-[10px] bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[15px] mb-1 text-foreground">系统方法</h4>
                    <p className="text-[13px] text-muted-foreground/70">将咨询方法论产品化，形成可复用的工具与模板</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-[10px] bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[15px] mb-1 text-foreground">长期陪伴</h4>
                    <p className="text-[13px] text-muted-foreground/70">从规划到执行，从诊断到落地，全程陪伴支持</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-muted/5">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">
              核心价值观
            </h2>
            <p className="text-[14px] text-muted-foreground/60">
              这四个价值观贯穿我们所有的服务和工作方式
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {coreValues.map((value, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-[24px] p-7 border border-border/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-[18px] font-semibold mb-3 group-hover:text-primary transition-colors text-foreground">
                  {value.title}
                </h3>
                <p className="text-muted-foreground/70 leading-relaxed text-[14px]">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">
              服务内容
            </h2>
            <p className="text-[14px] text-muted-foreground/60">
              三大核心模块，覆盖企业战略落地的全生命周期
            </p>
          </div>

          <div className="space-y-5">
            {services.map((service, index) => (
              <div
                key={index}
                className={`bg-white/80 backdrop-blur-sm rounded-[24px] p-7 flex flex-col md:flex-row gap-6 items-center border border-border/40 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-[12px] bg-gradient-to-br ${service.color} flex items-center justify-center`}>
                      <service.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-[20px] font-semibold text-foreground">{service.category}</h3>
                  </div>
                  
                  <p className="text-muted-foreground/70 mb-5 text-[14px] leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature, fIndex) => (
                      <span
                        key={fIndex}
                        className="px-3 py-1.5 rounded-full bg-muted/50 text-[12px] text-muted-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="hidden md:block w-px h-24 bg-border/40" />
                
                <div className="flex-shrink-0">
                  <button 
                    onClick={() => handleNavigate('strategy')}
                    className="px-6 py-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <span className="font-medium text-[14px]">了解更多</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-muted/5">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">
              发展历程
            </h2>
            <p className="text-[14px] text-muted-foreground/60">
              从初心到使命，益语智库的成长故事
            </p>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-secondary/30 to-accent/30" />
            
            <div className="space-y-10">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-6 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'}`}>
                    <div className="bg-white/80 backdrop-blur-sm rounded-[16px] p-5 border border-border/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                      <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 text-primary text-[12px] font-medium mb-3">
                        {milestone.year}
                      </span>
                      <h3 className="text-[16px] font-semibold mb-2 text-foreground">{milestone.title}</h3>
                      <p className="text-muted-foreground/70 text-[13px] leading-relaxed">{milestone.description}</p>
                    </div>
                  </div>
                  
                  <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-lg hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">
              核心团队
            </h2>
            <p className="text-[14px] text-muted-foreground/60">
              汇聚咨询、技术与产品领域的资深专家
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-[24px] p-7 border border-border/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 text-center group">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mx-auto mb-5 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <span className="text-white text-[28px] font-semibold">
                    {member.name.charAt(0)}
                  </span>
                </div>
                
                <h3 className="text-[17px] font-semibold mb-1 text-foreground">{member.name}</h3>
                <p className="text-primary text-[13px] mb-4">{member.role}</p>
                
                <p className="text-muted-foreground/70 text-[13px] mb-5 leading-relaxed">
                  {member.bio}
                </p>
                
                <div className="flex flex-wrap justify-center gap-1.5">
                  {member.expertise.map((exp, eIndex) => (
                    <span
                      key={eIndex}
                      className="px-2.5 py-1 rounded-full bg-muted/50 text-[11px] text-muted-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Join Us */}
          <div className="mt-14 text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-10 max-w-2xl mx-auto border border-border/40">
              <h3 className="text-[20px] font-semibold mb-3 text-foreground">加入我们</h3>
              <p className="text-muted-foreground/70 text-[14px] mb-7 leading-relaxed">
                我们正在寻找志同道合的伙伴，一起助力更多企业实现持续增长
              </p>
              <button className="px-8 py-3.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-primary/25">
                <span className="font-medium text-[14px]">查看职位机会</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-muted/5">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">
              联系我们
            </h2>
            <p className="text-[14px] text-muted-foreground/60">
              期待与您一起探讨企业增长的更多可能
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-4">
              {contactInfo.map((info, index) => (
                <a
                  key={index}
                  href={info.href}
                  className="flex items-center gap-4 p-4.5 bg-white/80 backdrop-blur-sm rounded-[16px] border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                >
                  <div className="w-11 h-11 rounded-[12px] bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <info.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[12px] text-muted-foreground/60 mb-0.5">{info.label}</p>
                    <p className="font-medium text-[14px] text-foreground group-hover:text-primary transition-colors">
                      {info.value}
                    </p>
                  </div>
                </a>
              ))}
            </div>

            {/* Contact Form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-7 border border-border/40">
              <h3 className="text-[18px] font-semibold mb-6 text-foreground">发送消息</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium mb-2 text-muted-foreground/70">姓名</label>
                    <input
                      type="text"
                      placeholder="您的姓名"
                      className="w-full px-4 py-2.5 rounded-[12px] bg-muted/30 border border-border/40 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium mb-2 text-muted-foreground/70">公司</label>
                    <input
                      type="text"
                      placeholder="您的公司"
                      className="w-full px-4 py-2.5 rounded-[12px] bg-muted/30 border border-border/40 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium mb-2 text-muted-foreground/70">邮箱</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-[12px] bg-muted/30 border border-border/40 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium mb-2 text-muted-foreground/70">留言</label>
                  <textarea
                    rows={3}
                    placeholder="请描述您的需求..."
                    className="w-full px-4 py-2.5 rounded-[12px] bg-muted/30 border border-border/40 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none transition-all"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-primary/25 font-medium text-[14px]"
                >
                  发送消息
                </button>
              </form>
            </div>
          </div>
</div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-muted/5">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-10 text-center border border-border/40">
            <h2 className="text-[28px] font-semibold tracking-tight mb-3 text-foreground">
              开启战略陪伴之旅
            </h2>
            <p className="text-[15px] text-muted-foreground/70 mb-8 max-w-xl mx-auto leading-relaxed">
              预约免费诊断对话，了解您的企业如何实现持续增长
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => handleNavigate('strategy')}
                className="group px-8 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25 flex items-center gap-2"
              >
                <span className="font-medium text-[15px]">预约咨询</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button 
                onClick={() => handleNavigate('learning')}
                className="group px-8 py-4 rounded-full border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.02] flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span className="font-medium text-[15px]">探索学习资源</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default AboutPage;
