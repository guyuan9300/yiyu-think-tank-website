import { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  Star,
  FolderOpen,
  Clock,
  TrendingUp,
  BookOpen,
  FileText,
  Download,
  Command,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Calendar,
  Target,
  Award,
  Settings,
  Edit,
  Trash2,
  Share2,
  Copy,
  Eye,
  Play,
  ChevronRight as ArrowRight
} from 'lucide-react';

interface LearningItem {
  id: string;
  title: string;
  type: string;
  progress: number;
  lastLearn: string;
  totalTime: string;
  folder?: string;
  isFavorite?: boolean;
  certificate?: boolean;
}

interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  itemCount: number;
  learningCount: number;
  updatedAt: string;
}

interface StudyStat {
  label: string;
  value: string;
  change: string;
  icon: typeof Clock;
  color: string;
}

export function MyLearningPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'learning' | 'folders' | 'collections'>('learning');

  const stats: StudyStat[] = [
    { label: '本周学习', value: '12.5h', change: '+23%', icon: Clock, color: 'bg-blue-500' },
    { label: '累计学习', value: '156h', change: '+8h', icon: TrendingUp, color: 'bg-green-500' },
    { label: '完成项目', value: '32个', change: '+3', icon: Target, color: 'bg-purple-500' },
    { label: '获得证书', value: '8张', change: '🏆', icon: Award, color: 'bg-orange-500' },
  ];

  const folders: Folder[] = [
    { id: '1', name: '行业报告', icon: '📊', color: 'bg-blue-500', itemCount: 45, learningCount: 23, updatedAt: '2026-01-20' },
    { id: '2', name: '战略管理', icon: '🎯', color: 'bg-purple-500', itemCount: 32, learningCount: 18, updatedAt: '2026-01-19' },
    { id: '3', name: '数字化转型', icon: '🚀', color: 'bg-cyan-500', itemCount: 28, learningCount: 15, updatedAt: '2026-01-18' },
    { id: '4', name: '数据分析', icon: '📈', color: 'bg-green-500', itemCount: 24, learningCount: 20, updatedAt: '2026-01-17' },
    { id: '5', name: '组织发展', icon: '🌱', color: 'bg-orange-500', itemCount: 21, learningCount: 12, updatedAt: '2026-01-15' },
    { id: '6', name: 'AI应用', icon: '🤖', color: 'bg-pink-500', itemCount: 19, learningCount: 14, updatedAt: '2026-01-20' },
  ];

  const learningItems: LearningItem[] = [
    { id: '1', title: '2026公益行业数字化现状报告', type: '报告', progress: 75, lastLearn: '10分钟前', totalTime: '2h 30min', folder: '行业报告', isFavorite: true },
    { id: '2', title: '《精益数据分析》PPT笔记', type: '书籍', progress: 100, lastLearn: '1小时前', totalTime: '45min', folder: '数据分析', isFavorite: true, certificate: true },
    { id: '3', title: 'AI落地能力成熟度模型', type: '工具', progress: 30, lastLearn: '2小时前', totalTime: '1h 15min', folder: 'AI应用' },
    { id: '4', title: '战略规划助手指令', type: '指令', progress: 0, lastLearn: '3小时前', totalTime: '15min', folder: '战略管理', isFavorite: true },
    { id: '5', title: '供应链韧性评估工具包', type: '工具', progress: 50, lastLearn: '昨天', totalTime: '2h', folder: '数字化转型' },
    { id: '6', title: '《组织学习手册》提炼', type: '书籍', progress: 85, lastLearn: '昨天', totalTime: '1h 10min', folder: '组织发展' },
    { id: '7', title: '波特五力模型可视化', type: '图像', progress: 100, lastLearn: '3天前', totalTime: '20min', folder: '战略管理' },
    { id: '8', title: '项目管理甘特图模板', type: '工具', progress: 100, lastLearn: '1周前', totalTime: '30min', folder: '数字化转型', certificate: true },
  ];

  const collections = [
    { id: '1', name: '待阅读', count: 12, icon: '📚' },
    { id: '2', name: '重点关注', count: 8, icon: '⭐' },
    { id: '3', name: '学习计划', count: 5, icon: '📅' },
    { id: '4', name: '已完成', count: 45, icon: '✅' },
  ];

  const filteredItems = learningItems.filter(item => {
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '报告': return FileText;
      case '书籍': return BookOpen;
      case '工具': return Download;
      case '指令': return Command;
      case '图像': return FolderOpen;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '报告': return 'bg-blue-500/10 text-blue-600';
      case '书籍': return 'bg-green-500/10 text-green-600';
      case '工具': return 'bg-orange-500/10 text-orange-600';
      case '指令': return 'bg-purple-500/10 text-purple-600';
      case '图像': return 'bg-cyan-500/10 text-cyan-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={true} userType="member" onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="pt-32 pb-10 px-4 sm:px-6 lg:px-8 border-b border-border/40">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground/70 tracking-[0.15em] uppercase mb-3">
                个人知识库
              </p>
              <h1 className="text-[32px] sm:text-[36px] font-semibold tracking-tight text-foreground flex items-center gap-3">
                <Star className="w-7 h-7 text-primary" />
                我的学习
              </h1>
              <p className="text-[15px] text/70 mt-2">
                学习进度 · 成长轨迹 ·-muted-foreground 知识积累
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/80 backdrop-blur-sm rounded-[16px] p-4 border border-border/40">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-8 h-8 rounded-[10px] ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[12px] text-muted-foreground/60">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[24px] font-semibold text-foreground">{stat.value}</span>
                    <span className="text-[12px] text-green-600">{stat.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex flex-col lg:flex-row gap-4 mt-8">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="搜索学习内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-5 py-3 bg-muted/50 border border-border/60 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button className="px-5 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all duration-300 flex items-center gap-2 hover:shadow-lg hover:shadow-primary/25">
                <Plus className="w-4 h-4" />
                <span className="font-medium text-[14px]">新建文件夹</span>
              </button>
              <button className="px-5 py-3 bg-white/80 border border-border/60 rounded-full hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground/70" />
                <span className="font-medium text-[14px] text-muted-foreground/70">设置</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border/40">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2">
            {[
              { id: 'learning', label: '学习记录', icon: Clock },
              { id: 'folders', label: '文件夹', icon: FolderOpen },
              { id: 'collections', label: '收藏集', icon: Star },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-foreground text-white'
                    : 'hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Folders Tab */}
          {activeTab === 'folders' && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-semibold text-foreground">我的文件夹</h2>
                <button className="text-[13px] text-primary hover:text-primary/80 transition-colors">管理</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-white/80 backdrop-blur-sm rounded-[20px] p-5 border border-border/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2.5xl">{folder.icon}</span>
                      <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted/50 transition-all">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground/60" />
                      </button>
                    </div>
                    <h3 className="font-medium text-[15px] text-foreground mb-1 truncate">{folder.name}</h3>
                    <p className="text-[12px] text-muted-foreground/60 mb-2">
                      {folder.itemCount} 项 · 学习 {folder.learningCount}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground/50">
                      <span>更新于 {folder.updatedAt}</span>
                    </div>
                  </div>
                ))}

                {/* New Folder Card */}
                <button className="bg-white/40 backdrop-blur-sm rounded-[20px] p-5 border-2 border-dashed border-border/60 hover:border-primary/40 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-muted-foreground/60 hover:text-primary cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex">
                    <Plus className="w items-center justify-center-5 h-5" />
                  </div>
                  <span className="text-[14px] font-medium">新建文件夹</span>
                </button>
              </div>
            </div>
          )}

          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-semibold text-foreground">收藏集</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="bg-white/80 backdrop-blur-sm rounded-[20px] p-5 border border-border/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{collection.icon}</span>
                      <span className="font-medium text-[15px] text-foreground">{collection.name}</span>
                    </div>
                    <p className="text-[28px] font-semibold text-foreground">{collection.count}</p>
                    <p className="text-[12px] text-muted-foreground/60">个项目</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Items */}
          {(activeTab === 'learning' || activeTab === 'collections') && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-semibold text-foreground">
                  {activeTab === 'learning' ? '最近学习' : '收藏内容'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 rounded-full transition-all duration-300 ${viewMode === 'grid' ? 'bg-foreground text-white' : 'bg-white/80 border border-border/60 hover:border-primary/40'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 rounded-full transition-all duration-300 ${viewMode === 'list' ? 'bg-foreground text-white' : 'bg-white/80 border border-border/60 hover:border-primary/40'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white/80 backdrop-blur-sm rounded-[20px] overflow-hidden border border-border/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                    >
                      {/* Progress Bar */}
                      <div className="h-1.5 bg-muted/50">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getTypeColor(item.type)}`}>
                            {item.type}
                          </span>
                          {item.isFavorite && (
                            <Star className="w-4 h-4 text-amber-500 ml-auto" />
                          )}
                        </div>

                        <h3 className="font-medium text-[15px] text-foreground mb-3 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>

                        {item.folder && (
                          <p className="text-[12px] text-muted-foreground/60 mb-3 flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5" />
                            {item.folder}
                          </p>
                        )}

                        {item.progress > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 mb-1.5">
                              <span>学习进度</span>
                              <span>{item.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {item.certificate && (
                          <div className="flex items-center gap-1.5 text-[11px] text-orange-600 mb-3">
                            <Award className="w-3.5 h-3.5" />
                            <span>已完成并获得证书</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[12px] text-muted-foreground/50 pt-3 border-t border-border/40">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {item.lastLearn}
                          </span>
                          <span>{item.totalTime}</span>
                        </div>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2 transform scale-90 group-hover:scale-100 transition-all">
                          <button className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all shadow-lg">
                            <Play className="w-4 h-4" />
                          </button>
                          <button className="p-3 bg-white text-foreground rounded-full hover:bg-muted/50 transition-all shadow-lg">
                            <Star className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-[20px] overflow-hidden border border-border/40">
                  {filteredItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 p-4.5 hover:bg-muted/30 transition-all cursor-pointer ${
                        index !== filteredItems.length - 1 ? 'border-b border-border/40' : ''
                      }`}
                    >
                      {/* Type Icon */}
                      <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center ${getTypeColor(item.type)}`}>
                        {(() => {
                          const Icon = getTypeIcon(item.type);
                          return <Icon className="w-5 h-5" />;
                        })()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[15px] text-foreground truncate">{item.title}</h3>
                          {item.certificate && (
                            <Award className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[12px] text-muted-foreground/60">
                          <span className="flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5" />
                            {item.folder || '未分类'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {item.lastLearn}
                          </span>
                          <span>{item.totalTime}</span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="w-32">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 mb-1.5">
                          <span>进度</span>
                          <span>{item.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button className="p-2.5 rounded-full hover:bg-muted/50 transition-all text-muted-foreground/70">
                          <Play className="w-4 h-4" />
                        </button>
                        <button className="p-2.5 rounded-full hover:bg-muted/50 transition-all">
                          {item.isFavorite ? (
                            <Star className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Star className="w-4 h-4 text-muted-foreground/50" />
                          )}
                        </button>
                        <button className="p-2.5 rounded-full hover:bg-muted/50 transition-all text-muted-foreground/50">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={(p) => onNavigate?.(p)} />


    </div>
  );
}

export default MyLearningPage;
