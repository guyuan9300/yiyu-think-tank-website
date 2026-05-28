import { useState } from 'react';
import { AdminV2Shell, type AdminV2ModuleId } from './AdminV2Shell';
import {
  DashboardOverview,
  ArticlesManagement,
  ReportsManagement,
  HomeConfig,
  AboutConfig,
  SiteSettings,
  MembersManagement,
  OrdersManagement,
  ConsultRequests,
  StrategyClients,
} from './AdminV2Modules';

// admin-v2 入口页. 默认渲染 数据概览 (overview) 模块.
// 当前所有模块用 mock placeholder, 等验收后再统一接 dataService.

export function AdminV2Page({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [activeModule, setActiveModule] = useState<AdminV2ModuleId>('overview');

  const renderModule = () => {
    switch (activeModule) {
      case 'overview':         return <DashboardOverview />;
      case 'articles':         return <ArticlesManagement />;
      case 'reports':          return <ReportsManagement />;
      case 'home-config':      return <HomeConfig />;
      case 'about-config':     return <AboutConfig />;
      case 'site-settings':    return <SiteSettings />;
      case 'members':          return <MembersManagement />;
      case 'orders':           return <OrdersManagement />;
      case 'consult-requests': return <ConsultRequests />;
      case 'strategy-clients': return <StrategyClients />;
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
