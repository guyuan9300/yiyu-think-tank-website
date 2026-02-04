import { useState } from 'react';
import { ArrowLeft, Clock, Eye, Download, Share2, Bookmark, FileText, Users, Target, CheckCircle, Zap } from 'lucide-react';
import { Header } from './Header';

interface CaseDetailPageProps {
  caseId: string;
  onNavigate: (page: 'home' | 'strategy' | 'article' | 'report' | 'topic' | 'case', id?: string) => void;
}

// 案例数据
const casesData: Record<string, {
  industry: string;
  project: string;
  title: string;
  challenge: string;
  action: string;
  results: string[];
  details: string[];
  tags: string[];
  duration: string;
  teamSize: string;
}> = {
  'blue-letter': {
    industry: '公益组织',
    project: '蓝信封',
    title: '战略陪伴如何把复杂项目落到岗位与指标',
    challenge: '项目堆叠导致资源分散，团队疲于奔命。组织同时开展多个项目，但缺乏统一的目标管理体系，导致资源分配不均，团队成员疲于奔命却看不到明确成果。',
    action: '通过战略梳理确定核心项目，运用OKR将目标分解到每个岗位。建立月度复盘机制，确保战略执行的持续性和有效性。',
    results: [
      '月捐增长35%',
      '团队效率提升40%',
      '项目完成率提升至95%',
      '团队满意度提升至90%'
    ],
    details: [
      '第一阶段：战略梳理（1个月）- 深入了解组织现状，梳理核心使命和战略目标',
      '第二阶段：OKR建立（2个月）- 将战略目标分解为可执行的OKR，建立目标管理体系',
      '第三阶段：落地执行（3个月）- 辅导团队执行OKR，建立月度复盘机制',
      '第四阶段：持续优化（持续）- 定期评估效果，优化目标管理体系'
    ],
    tags: ['公益', '战略', '组织效能', 'OKR'],
    duration: '6个月',
    teamSize: '5人'
  },
  'tianzi': {
    industry: '品牌咨询',
    project: '田字格',
    title: '品牌与增长逻辑重构',
    challenge: '项目制业务导致知识无法沉淀。咨询公司长期依赖单个项目运转，项目结束后知识经验难以沉淀和复用。',
    action: '梳理核心能力边界，建立知识管理体系。将成功案例方法论标准化，形成可复用的知识资产。',
    results: [
      '客户续约率85%',
      '新人培养周期缩短50%',
      '知识复用率提升300%',
      '项目交付效率提升40%'
    ],
    details: [
      '第一阶段：能力梳理（1个月）- 梳理组织核心能力和边界，定义差异化定位',
      '第二阶段：知识沉淀（2个月）- 整理历史项目经验，建立知识库和方法论文档',
      '第三阶段：体系建设（2个月）- 建立知识管理体系，包括知识收集、整理、分享流程',
      '第四阶段：持续运营（持续）- 知识运营和迭代优化，形成学习型组织'
    ],
    tags: ['咨询', '组织效能', '知识管理'],
    duration: '5个月',
    teamSize: '8人'
  },
  'dream': {
    industry: '教育',
    project: '真爱梦想',
    title: 'AI如何回到教育本质',
    challenge: '技术工具引入后效果不佳。学校引入了多种AI工具，但教师使用率低，工具与教学场景脱节。',
    action: '以学生为中心设计AI应用场景，建立培训体系。通过实际案例展示AI价值，逐步培养教师AI素养。',
    results: [
      '教师AI使用率78%',
      '教学个性化显著提升',
      '备课时间缩短30%',
      '学生参与度提升45%'
    ],
    details: [
      '第一阶段：需求调研（2周）- 深入了解教学场景和教师需求，识别AI应用机会点',
      '第二阶段：场景设计（1个月）- 设计以学生为中心的AI应用场景，优先解决痛点问题',
      '第三阶段：试点实施（2个月）- 选择重点班级试点，收集反馈并迭代优化',
      '第四阶段：全面推广（2个月）- 建立培训体系，全面推广成功经验'
    ],
    tags: ['教育', 'AI落地', '数字化转型'],
    duration: '6个月',
    teamSize: '6人'
  }
};

export function CaseDetailPage({ caseId, onNavigate }: CaseDetailPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const caseData = casesData[caseId] || casesData['blue-letter'];

  return (
    <div className="min-h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        userType={isLoggedIn ? 'member' : 'visitor'}
        onNavigate={(page) => {
          if (page === 'strategy' || page === 'home') {
            onNavigate(page as 'home' | 'strategy');
          } else {
            onNavigate('strategy');
          }
        }}
      />

      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-purple-50 via-white to-blue-50 border-b border-border/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Back Button */}
            <button
              onClick={() => onNavigate('strategy')}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm font-medium">返回战略陪伴</span>
            </button>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-5 animate-fadeIn">
              <span className="px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                {caseData.industry}
              </span>
              {caseData.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-[44px] font-bold mb-4 leading-tight tracking-tight text-foreground animate-fadeInUp">
              {caseData.title}
            </h1>

            {/* Project Name */}
            <div className="flex items-center gap-3 mb-6 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
              <span className="text-lg font-medium text-muted-foreground">项目：</span>
              <span className="text-xl font-bold text-primary">{caseData.project}</span>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground animate-fadeInUp" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">服务周期：{caseData.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">项目团队：{caseData.teamSize}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="font-medium">咨询方式：战略陪伴</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Challenge */}
              <div className="p-6 rounded-2xl bg-red-50/80 border border-red-100 animate-fadeInUp">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-3 text-foreground">
                  <span className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">挑战</span>
                  面临挑战
                </h3>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {caseData.challenge}
                </p>
              </div>

              {/* Action */}
              <div className="p-6 rounded-2xl bg-blue-50/80 border border-blue-100 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-3 text-foreground">
                  <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">行动</span>
                  采取行动
                </h3>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {caseData.action}
                </p>
              </div>

              {/* Results */}
              <div className="p-6 rounded-2xl bg-green-50/80 border border-green-100 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-3 text-foreground">
                  <span className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">成果</span>
                  取得成果
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {caseData.results.map((result, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="font-semibold text-green-800">{result}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Process Timeline */}
              <div className="p-6 rounded-2xl bg-muted/20 border border-border/30 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
                <h3 className="text-lg font-semibold mb-6 text-foreground">实施过程</h3>
                <div className="space-y-5">
                  {caseData.details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-4 group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 pt-1.5 leading-relaxed">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar - Action Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 border border-primary/20 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
                <h3 className="font-semibold mb-4 text-foreground">相关资源</h3>

                {/* Action Buttons */}
                <div className="space-y-3 mb-6">
                  <button className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    <Download className="w-5 h-5" />
                    下载完整案例PDF
                  </button>
                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className={`w-full py-3.5 rounded-2xl font-medium transition-all hover:scale-[1.02] flex items-center justify-center gap-2 ${
                      isBookmarked
                        ? 'bg-primary/20 text-primary shadow-lg'
                        : 'bg-white/50 hover:bg-white/80'
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                    {isBookmarked ? '已收藏' : '收藏案例'}
                  </button>
                  <button className="w-full py-3.5 rounded-2xl bg-white/50 hover:bg-white/80 transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                    <Share2 className="w-5 h-5" />
                    分享给好友
                  </button>
                </div>

                {/* Related Cases */}
                <div className="pt-6 border-t border-border/30">
                  <h4 className="font-medium mb-3 text-foreground">相关案例</h4>
                  <div className="space-y-3">
                    {Object.entries(casesData)
                      .filter(([key]) => key !== caseId)
                      .slice(0, 2)
                      .map(([key, caseItem]) => (
                        <div
                          key={key}
                          className="p-4 rounded-xl bg-white/50 hover:bg-white transition-all cursor-pointer group hover:scale-[1.02]"
                          onClick={() => onNavigate('case', key)}
                        >
                          <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors duration-200">
                            {caseItem.project}
                          </div>
                          <div className="text-xs text-muted-foreground">{caseItem.industry}</div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Contact CTA */}
                <div className="mt-6 p-4 rounded-xl bg-white/60 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground mb-3">
                    想了解更多成功案例？
                  </p>
                  <button
                    onClick={() => onNavigate('strategy')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:opacity-90 transition-all shadow-lg"
                  >
                    预约咨询对话
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
