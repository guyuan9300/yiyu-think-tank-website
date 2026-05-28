// 软件外壳（左侧导航 + 底部系统状态块）—— 三个场景共用。
// 性质说明：这是【按截图重画】，不是 1:1 搬运 —— 软件的 App.tsx 是巨石组件，
// 没有可直接 import 的"AppShell"。导航条目、图标、文案、布局节奏都对照 V2.0 软件截图复刻。
//
// Canvas 约定：所有 scene 在原生像素 1280 × 920 画布上渲染，
// 由外层 HeroProductDemo 用 transform: scale() 缩到 Hero 槽位。
// 因此内部使用真实软件像素值（14px 文字 / 28px 图标等），缩放后视觉密度=软件本身。

import {
  Briefcase,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Newspaper,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type AppNavKey = 'tasks' | 'workspace' | 'strategy' | 'intel' | 'growth';

interface NavItem {
  key: AppNavKey;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'tasks', label: '任务与日程', icon: CheckSquare },
  { key: 'workspace', label: '工作台', icon: Briefcase },
  { key: 'strategy', label: '战略陪伴', icon: Target },
  { key: 'intel', label: '资讯情报站', icon: Newspaper },
  { key: 'growth', label: '成长中心', icon: TrendingUp },
];

interface AppShellProps {
  activeNav: AppNavKey;
  children: ReactNode;
}

export function AppShell({ activeNav, children }: AppShellProps): JSX.Element {
  return (
    <div
      className="relative bg-[#FAFAFA] text-[#0F172A] font-sans"
      style={{ width: 1280, height: 920, fontSize: 14, lineHeight: 1.45 }}
    >
      {/* 左侧导航 */}
      <aside
        className="absolute left-0 top-0 bottom-0 bg-white border-r border-[#E5E7EB] flex flex-col"
        style={{ width: 220 }}
      >
        {/* Logo 区 */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div
              className="rounded-md flex items-center justify-center text-white text-[12px] font-bold tracking-tight"
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg,#1F2D6E 0%,#3A4FB5 100%)',
              }}
            >
              益语
            </div>
            <span className="text-[15px] font-semibold text-[#16265E] tracking-tight">益语智库</span>
          </div>
          <ChevronLeft size={16} className="text-[#94A3B8]" />
        </div>

        {/* Nav 列表 */}
        <nav className="flex-1 px-3 mt-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeNav;
            return (
              <div
                key={item.key}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 ${
                  active ? 'bg-[#EEF3FF] text-[#3A4FB5]' : 'text-[#475569]'
                }`}
              >
                <Icon size={18} className={active ? 'text-[#3A4FB5]' : 'text-[#64748B]'} />
                <span className={`text-[14px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* 底部系统状态 */}
        <div className="px-4 pb-4 pt-3 border-t border-[#F1F5F9]">
          <div className="text-[10px] font-bold tracking-[1.4px] text-[#94A3B8] mb-2">
            SYSTEM · 系统状态
          </div>
          <div className="flex items-center justify-between text-[12px] text-[#334155] mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>数据中心</span>
            </div>
            <span className="text-[11px] text-[#64748B]">在线</span>
          </div>
          <div className="flex items-center justify-between text-[12px] text-[#334155] mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>大模型</span>
            </div>
            <span className="text-[11px] text-[#64748B]">豆包 2.0</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#475569] mb-3">
            <Settings size={14} />
            <span>系统设置</span>
          </div>

          <div className="text-[10px] font-bold tracking-[1.4px] text-[#94A3B8] mb-1.5">
            CURRENT · 当前登录
          </div>
          <div className="text-[13px] font-semibold text-[#0F172A]">顾源源</div>
          <div className="text-[10px] text-[#94A3B8] mt-0.5 mb-2 truncate">
            doubao-seed-2-0-pro-260215 · 13 ...
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
            <span>退出登录</span>
            <ChevronRight size={12} />
          </div>
        </div>
      </aside>

      {/* 主区 */}
      <main className="absolute left-[220px] right-0 top-0 bottom-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

// 共用图标导出，让 scene 文件不必各自再 import 一次
export { Sparkles, Building2 };
