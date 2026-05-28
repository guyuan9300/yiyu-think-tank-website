import { useState } from 'react';
import { AdminV2Shell, type AdminV2ModuleId } from './AdminV2Shell';
import {
  DashboardOverview,
  ReportsManagement,
  MembersManagement,
  OrdersManagement,
  ConsultRequests,
  StrategyClients,
} from './AdminV2Modules';
import { DoubaoLanguageAccess, DoubaoImageAccess } from './AdminV2ModelAccess';
// 真功能版文章管理 (接 vite-plugin-admin-ai, 替代 mock 版)
import { ArticlesAiManagement } from './ArticlesAiManagement';

// admin-v2 入口页. 默认渲染 数据概览 (overview) 模块.
// 当前所有模块用 mock placeholder, 等验收后再统一接 dataService.

export function AdminV2Page({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [activeModule, setActiveModule] = useState<AdminV2ModuleId>('overview');

  const renderModule = () => {
    switch (activeModule) {
      case 'overview':         return <DashboardOverview />;
      case 'articles':         return <ArticlesAiManagement />;
      case 'reports':          return <ReportsManagement />;
      case 'members':          return <MembersManagement />;
      case 'orders':           return <OrdersManagement />;
      case 'consult-requests': return <ConsultRequests />;
      case 'strategy-clients': return <StrategyClients />;
      case 'doubao-language':  return <DoubaoLanguageAccess />;
      case 'doubao-image':     return <DoubaoImageAccess />;
      default:                 return <DashboardOverview />;
    }
  };

  return (
    <AdminV2Shell
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      onNavigateOut={onNavigate}
    >
      {renderModule()}
    </AdminV2Shell>
  );
}
