import { useState } from 'react';
import { ArrowLeft, Clock, Eye, MessageCircle, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { Header } from './Header';

interface TopicDetailPageProps {
  topicId: string;
  onNavigate: (page: string, id?: string) => void;
}

export function TopicDetailPage({ topicId, onNavigate }: TopicDetailPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'reports' | 'discussion'>('overview');

  // Mock topic data - in production, fetch from Supabase
  const topic = {
    id: topicId,
    title: 'AI大模型在企业级应用中的实践与探索',
    category: '人工智能',
    publishDate: '2024-03-18',
    updateDate: '2024-03-20',
    readTime: '20分钟',
    views: 8920,
    participants: 1234,
    discussions: 89,
    trend: '+23%',
    description: '随着ChatGPT的横空出世，AI大模型技术正在深刻改变企业运营方式。本专题汇聚了行业专家的最新研究和实践经验，探讨AI大模型在企业级应用中的落地路径。',
    keyQuestions: [
      'AI大模型如何赋能企业核心业务？',
      '如何构建企业级AI应用的技术架构？',
      'AI应用的隐私和安全如何保障？',
      '企业如何培养AI人才和团队？'
    ],
    experts: [
      { name: '李博士', title: 'AI实验室首席科学家', avatar: '李' },
      { name: '王教授', title: '计算机系主任', avatar: '王' },
      { name: '张总', title: '科技公司CEO', avatar: '张' }
    ],
    relatedInsights: [
      { title: '企业AI应用的五大挑战', type: '洞察' },
      { title: '大模型时代的组织变革', type: '洞察' },
      { title: 'AI产品经理的能力模型', type: '洞察' }
    ],
    relatedReports: [
      { title: '2024年AI应用市场研究报告', type: '报告' },
      { title: '企业AI成熟度评估白皮书', type: '报告' },
      { title: 'AI技术落地实践案例集', type: '报告' }
    ],
    tags: ['AI大模型', '企业应用', '数字化转型', '技术落地']
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        userType={isLoggedIn ? 'member' : 'visitor'}
        onNavigate={(page) => {
          if (page === 'topic') {
            onNavigate('home');
          } else if (page === 'login' || page === 'register') {
            onNavigate(page as 'login' | 'register');
          } else if (page === 'article') {
            onNavigate('article', 'temp');
          } else if (page === 'report') {
            onNavigate('report', 'temp');
          } else {
            onNavigate(page as any);
          }
        }}
      />

      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-accent/5 via-background to-primary/5 border-b border-border/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Back Button */}
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm font-medium">返回首页</span>
            </button>

            {/* Category Badge & Trend */}
            <div className="flex items-center gap-3 mb-5 animate-fadeIn">
              <span className="px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium">
                {topic.category}
              </span>
              <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                {topic.trend}热度上升
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-[44px] font-bold mb-4 leading-tight tracking-tight text-foreground animate-fadeInUp">
              {topic.title}
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed max-w-3xl animate-fadeInUp" style={{ animationDelay: '100ms' }}>
              {topic.description}
            </p>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground animate-fadeInUp" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  更新: {topic.updateDate}
                </span>
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {topic.views}次浏览
                </span>
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {topic.participants}人关注
                </span>
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {topic.discussions}条讨论
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border/50 bg-white/50 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2">
              {[
                { id: 'overview', label: '概览' },
                { id: 'insights', label: '相关洞察' },
                { id: 'reports', label: '相关报告' },
                { id: 'discussion', label: '讨论区' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-5 text-sm font-medium border-b-2 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-8">
                {/* Key Questions */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 animate-fadeInUp">
                  <h3 className="text-lg font-semibold mb-4 text-foreground">核心议题</h3>
                  <ul className="space-y-4">
                    {topic.keyQuestions.map((question, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-primary text-sm font-bold">{index + 1}</span>
                        </div>
                        <span className="text-muted-foreground leading-relaxed text-lg">{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Expert Opinions */}
                <div className="p-6 rounded-2xl bg-muted/20 border border-border/30 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">专家观点</h3>
                  <div className="space-y-4">
                    {topic.experts.map((expert, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-background/50 hover:bg-background transition-all duration-200">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                          <span className="text-white font-semibold">{expert.avatar}</span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{expert.name}</div>
                          <div className="text-sm text-muted-foreground mt-0.5">{expert.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                  {topic.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-full bg-muted/30 text-sm hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Follow Topic */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 text-center animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-foreground">{topic.participants}</div>
                    <div className="text-sm text-muted-foreground mt-1">人已关注此话题</div>
                  </div>
                  <button
                    className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/20"
                    onClick={() => setIsLoggedIn(true)}
                  >
                    立即关注
                  </button>
                </div>

                {/* Stats */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                  <h4 className="font-medium mb-3 text-foreground">话题数据</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-foreground">{topic.views}</div>
                      <div className="text-xs text-muted-foreground mt-1">浏览量</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-foreground">{topic.discussions}</div>
                      <div className="text-xs text-muted-foreground mt-1">讨论数</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-4">
              {topic.relatedInsights.map((insight, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/50 hover:bg-muted/30 transition-all duration-300 cursor-pointer group animate-fadeInUp"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => onNavigate('article', `insight-${index}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-primary font-medium">{insight.type}</span>
                      <h4 className="font-medium mt-1 group-hover:text-primary transition-colors duration-200">{insight.title}</h4>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              {topic.relatedReports.map((report, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/50 hover:bg-muted/30 transition-all duration-300 cursor-pointer group animate-fadeInUp"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => onNavigate('report', `report-${index}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-accent font-medium">{report.type}</span>
                      <h4 className="font-medium mt-1 group-hover:text-accent transition-colors duration-200">{report.title}</h4>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'discussion' && (
            <div className="text-center py-16 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-3 text-foreground">讨论区</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                登录后参与话题讨论，与行业专家交流
              </p>
              <button
                className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/20"
                onClick={() => onNavigate('login')}
              >
                登录参与讨论
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
