import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, FileText, Folder,
  Users, ShoppingCart, ClipboardList, UserCheck, KeyRound,
  Bot, Image as ImageIcon,
  Menu, X, LogOut, ExternalLink, ArrowLeft,
  Rocket, Send, Inbox,
  Wallet, HandHeart,
} from 'lucide-react';

// ============================================================
// admin-v2 · 统一后台壳 (sidebar + topbar + content)
// 设计语言: open-source-home os 色板 (深蓝 + 冷蓝白 + 衬线大标题)
// 数据: 完全占位, 不接 dataService, 等所有功能验收完再统一接
// ============================================================

export type AdminV2ModuleId =
  | 'overview'
  | 'articles'
  | 'reports'
  | 'members'
  | 'beta-applications'
  | 'orders'
  | 'consult-requests'
  | 'strategy-clients'
  | 'doubao-language'
  | 'doubao-image'
  | 'release-publish'
  | 'release-targeting'
  | 'release-feedback'
  | 'finance-cashflow'
  | 'finance-support-pool';

export interface ModuleDef {
  id: AdminV2ModuleId;
  label: string;
  icon: ReactNode;
  group: '数据' | '内容管理' | '用户与商务' | '模型接入' | '发版与反馈' | '财务';
  description?: string;
}

// 2026-05-28 顾源源决定: 首页配置 + 关于我们配置 + 整站设置 走"直接改代码" 路径.
// 模型接入 = 豆包语言模型 + 豆包图像模型 两个完整接入入口 (各 7-8 段配置).
export const ADMIN_V2_MODULES: ModuleDef[] = [
  { id: 'overview',         label: '数据概览',     icon: <LayoutDashboard className="w-4 h-4" />, group: '数据',       description: 'KPI / 流量 / 转化漏斗' },
  { id: 'articles',         label: '文章',         icon: <FileText className="w-4 h-4" />,       group: '内容管理',   description: '文章 CRUD' },
  { id: 'reports',          label: '报告',         icon: <Folder className="w-4 h-4" />,         group: '内容管理',   description: '报告 CRUD + 自做/推荐' },
  { id: 'members',          label: '会员管理',     icon: <Users className="w-4 h-4" />,          group: '用户与商务', description: '用户列表 + 会员等级' },
  { id: 'beta-applications', label: '内测预约',    icon: <KeyRound className="w-4 h-4" />,       group: '用户与商务', description: '益语智库 AI 内测 · 审核发码' },
  { id: 'orders',           label: '订单管理',     icon: <ShoppingCart className="w-4 h-4" />,   group: '用户与商务', description: '付费 / 退款 / 流水' },
  { id: 'consult-requests', label: '申请咨询',     icon: <ClipboardList className="w-4 h-4" />,  group: '用户与商务', description: 'consult-apply 提交列表' },
  { id: 'strategy-clients', label: '战略陪伴客户', icon: <UserCheck className="w-4 h-4" />,      group: '用户与商务', description: '已签约客户名册' },
  { id: 'doubao-language',  label: '豆包·语言模型', icon: <Bot className="w-4 h-4" />,            group: '模型接入',   description: '文本 · 文章排版 / 报告介绍 / 益语通' },
  { id: 'doubao-image',     label: '豆包·图像模型', icon: <ImageIcon className="w-4 h-4" />,      group: '模型接入',   description: '图像 · 文章封面 / 插图 / 报告封面' },
  { id: 'release-publish',   label: '版本发布',   icon: <Rocket className="w-4 h-4" />,    group: '发版与反馈', description: '版本号 / 更新说明 / 安装包 / 发布 → 官网下载页' },
  { id: 'release-targeting', label: '定向推送',   icon: <Send className="w-4 h-4" />,      group: '发版与反馈', description: '按组织代码把最新版推给已安装用户' },
  { id: 'release-feedback',  label: '用户反馈',   icon: <Inbox className="w-4 h-4" />,     group: '发版与反馈', description: 'bug / 建议收件箱 + 状态流转' },
  { id: 'finance-cashflow',  label: '资金账本',   icon: <Wallet className="w-4 h-4" />,    group: '财务',       description: '收支科目录入 → 前台现金流量表' },
  { id: 'finance-support-pool', label: '行动者支持池', icon: <HandHeart className="w-4 h-4" />, group: '财务', description: '立项项目管理 → 前台支持池' },
];

interface AdminV2ShellProps {
  activeModule: AdminV2ModuleId;
  onModuleChange: (id: AdminV2ModuleId) => void;
  onNavigateOut: (page: string) => void;
  children: ReactNode;
}

export function AdminV2Shell({ activeModule, onModuleChange, onNavigateOut, children }: AdminV2ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeMeta = ADMIN_V2_MODULES.find(m => m.id === activeModule);

  // 按 group 分组渲染
  const grouped = ADMIN_V2_MODULES.reduce((acc, m) => {
    (acc[m.group] = acc[m.group] || []).push(m);
    return acc;
  }, {} as Record<string, ModuleDef[]>);

  return (
    <div className="min-h-screen bg-os-canvas flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[260px] bg-os-paper border-r border-os-line z-40 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-os-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-os-navy to-os-indigo flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif-display text-[15px] font-semibold text-os-navy">益语智库</span>
              <span className="text-[10px] text-os-muted tracking-[0.18em]">ADMIN · v2</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-os-mist text-os-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-5 overflow-y-auto h-[calc(100vh-4rem-3.5rem)]">
          {Object.entries(grouped).map(([group, mods]) => (
            <div key={group}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-os-muted/70 uppercase">
                {group}
              </div>
              <div className="space-y-0.5">
                {mods.map(m => {
                  const isActive = m.id === activeModule;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { onModuleChange(m.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-os-navy text-white shadow-os'
                          : 'text-os-ink/85 hover:bg-os-mist hover:text-os-navy'
                      }`}
                    >
                      <span className={isActive ? 'text-white/90' : 'text-os-blue/80'}>{m.icon}</span>
                      <span className="flex-1 text-left">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar 底部: 返回前台 (旧后台已屏蔽, 移除 Legacy 入口) */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-os-line p-3 bg-os-paper space-y-1">
          <button
            onClick={() => onNavigateOut('home')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] text-os-muted hover:bg-os-mist hover:text-os-navy transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回前台
          </button>
        </div>
      </aside>

      {/* Overlay on mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-os-paper/80 backdrop-blur-md border-b border-os-line sticky top-0 z-20 flex items-center px-5 sm:px-7">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 p-2 rounded-lg hover:bg-os-mist text-os-muted"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="text-[11px] tracking-[0.16em] font-semibold text-os-blue uppercase">
              {activeMeta?.group}
            </div>
            <div className="font-serif-display text-[18px] sm:text-[20px] font-semibold text-os-navy leading-tight truncate">
              {activeMeta?.label}
              {activeMeta?.description && (
                <span className="ml-3 text-[12px] font-sans font-normal text-os-muted">
                  {activeMeta.description}
                </span>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => onNavigateOut('home')}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium text-os-muted hover:text-os-navy hover:bg-os-mist transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3 h-3" />
              查看前台
            </button>
            <button
              onClick={() => onNavigateOut('login')}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium text-os-muted hover:text-os-navy hover:bg-os-mist transition-colors inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3 h-3" />
              退出
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
