/**
 * 战略客户管理后台 - 本地开发版本
 * Strategic Companion Admin Page - Local Development Version
 * 
 * 使用方法：
 * 1. 此版本使用 localStorage 进行数据存储
 * 2. 所有数据保存在浏览器本地，无需连接数据库
 * 3. 测试通过后，切换回 dataServiceSupabase.ts 使用线上数据库
 * 
 * 切换方法：将下面的导入改为
 * import { ... } from '../lib/dataServiceSupabase';
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  getStrategicMilestones,
  saveStrategicMilestone,
  deleteStrategicMilestone,
  getStrategicGoals,
  saveStrategicGoal,
  deleteStrategicGoal,
  getGoalMetrics,
  saveGoalMetric,
  deleteGoalMetric,
  getProjectEvents,
  saveProjectEvent,
  deleteProjectEvent,
  getProjectDocuments,
  saveProjectDocument,
  deleteProjectDocument,
  getProjectMeetings,
  saveProjectMeeting,
  deleteProjectMeeting,
  getClientProjects,
  saveClientProject,
  deleteClientProject,
  StrategicMilestone,
  StrategicGoal,
  GoalMetric,
  ProjectEvent,
  ProjectDocument,
  ProjectMeeting,
  ClientProject,
} from '../lib/dataServiceLocal';

// 客户选择下拉组件
interface ClientSelectorProps {
  clients: ClientProject[];
  selectedClient: ClientProject | null;
  onSelectClient: (client: ClientProject) => void;
  onAddClient: () => void;
  onEditClient: (client: ClientProject) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  clients,
  selectedClient,
  onSelectClient,
  onAddClient,
  onEditClient,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* 选择按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {selectedClient?.clientName?.charAt(0) || '选'}
          </div>
          <span className="font-medium text-gray-900">
            {selectedClient?.clientName || '请选择战略陪伴客户'}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉列表 */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto">
            {/* 添加客户按钮 */}
            <button
              onClick={() => {
                setIsOpen(false);
                onAddClient();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 hover:bg-blue-50 border-b border-gray-100"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-medium">添加新客户</span>
            </button>

            {/* 客户列表 */}
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => {
                  onSelectClient(client);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  selectedClient?.id === client.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                    selectedClient?.id === client.id
                      ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                      : 'bg-gray-300'
                  }`}>
                    {client.clientName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.clientName}</p>
                    {client.projectName && (
                      <p className="text-sm text-gray-500">{client.projectName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    client.status === 'active' ? 'bg-green-100 text-green-700' :
                    client.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {client.status === 'active' ? '进行中' :
                     client.status === 'completed' ? '已完成' : '已暂停'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      onEditClient(client);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// 项目概览卡片组件
interface ProjectOverviewProps {
  client: ClientProject;
  milestones: StrategicMilestone[];
  goals: StrategicGoal[];
  goalMetrics: Record<string, GoalMetric[]>;
  onAutoGenerateMilestones?: () => void;
}

const DEFAULT_MILESTONE_TEMPLATES: Array<Pick<StrategicMilestone, 'title' | 'phaseOrder'>> = [
  { title: '战略启动', phaseOrder: 1 },
  { title: '能力诊断', phaseOrder: 2 },
  { title: '战略共创', phaseOrder: 3 },
  { title: '执行赋能', phaseOrder: 4 },
  { title: '复盘迭代', phaseOrder: 5 },
];

const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  client,
  milestones,
  goals,
  goalMetrics,
  onAutoGenerateMilestones,
}) => {
  const displayMilestones = useMemo(() => {
    // If user hasn't generated milestones yet, still show the default 5-stage timeline.
    if (!milestones || milestones.length === 0) {
      return DEFAULT_MILESTONE_TEMPLATES.map((t) => ({
        id: `template-${t.phaseOrder}`,
        projectId: client.id,
        title: t.title,
        status: 'pending' as const,
        phaseOrder: t.phaseOrder,
        participants: [],
        outputs: [],
        sortOrder: t.phaseOrder,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      }));
    }

    // Ensure timeline is always 5 stages even if only partial milestones are created.
    const byTitle = new Map(milestones.map((m) => [m.title?.trim(), m]));
    return DEFAULT_MILESTONE_TEMPLATES.map((t) => {
      const found = byTitle.get(t.title);
      if (found) return found;
      return {
        id: `template-${t.phaseOrder}`,
        projectId: client.id,
        title: t.title,
        status: 'pending' as const,
        phaseOrder: t.phaseOrder,
        participants: [],
        outputs: [],
        sortOrder: t.phaseOrder,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      };
    });
  }, [milestones, client.id]);

  // 计算里程碑进度（直接使用该客户的 milestones.status）
  const milestoneProgress = useMemo(() => {
    const actual = milestones || [];
    if (actual.length === 0) return 0;
    const completed = actual.filter((m) => m.status === 'completed').length;
    return Math.round((completed / displayMilestones.length) * 100);
  }, [milestones, displayMilestones.length]);

  // 计算目标达成率
  const goalAchievement = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalProgress = goals.reduce((sum, goal) => sum + goal.progress, 0);
    return Math.round(totalProgress / goals.length);
  }, [goals]);

  // 获取状态标签样式
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-gray-100 text-gray-600',
      'in-progress': 'bg-yellow-100 text-yellow-600',
      'completed': 'bg-green-100 text-green-600',
    };
    const labels: Record<string, string> = {
      'pending': '待开始',
      'in-progress': '进行中',
      'completed': '已完成',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles['pending']}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 项目周期 */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{client.clientName}</h2>
          {client.projectName && (
            <p className="text-sm text-gray-500 mt-1">{client.projectName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {client.startDate || '未设置'} - {client.endDate || '未设置'}
          </span>
        </div>
      </div>

      {/* 进度概览 */}
      <div className="grid grid-cols-2 gap-6 px-6 py-6 bg-gradient-to-r from-blue-50 to-purple-50">
        {/* 里程碑进度 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">里程碑进度</span>
            <span className="text-2xl font-bold text-gray-900">{milestoneProgress}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {milestones.filter(m => m.status === 'completed').length} / {milestones.length} 阶段已完成
          </p>
        </div>

        {/* 目标达成 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">目标达成</span>
            <span className="text-2xl font-bold text-gray-900">{goalAchievement}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${goalAchievement}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {goals.length} 个目标正在跟踪
          </p>
        </div>
      </div>

      {/* 项目进度时间线 */}
      <div className="px-6 py-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">项目进度时间线</h3>
          {milestones.length === 0 && onAutoGenerateMilestones && (
            <button
              onClick={onAutoGenerateMilestones}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
            >
              一键生成时间线
            </button>
          )}
        </div>
        <div className="relative">
          {/* 时间线连接线 */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
          
          {/* 里程碑节点 */}
          <div className="flex justify-between relative">
            {displayMilestones.map((milestone, index) => {
              const status = milestone.status;
              const isCompleted = status === 'completed';
              const isInProgress = status === 'in-progress';

              return (
                <div key={milestone.id} className="flex flex-col items-center relative z-10">
                  {/* 节点圆圈 */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isInProgress ? 'bg-yellow-500 text-white animate-pulse' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* 里程碑名称 */}
                  <div className="text-center">
                    <p className={`text-xs font-medium ${isCompleted || isInProgress ? 'text-gray-900' : 'text-gray-400'}`}>
                      {milestone.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{getStatusBadge(status)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};

// 数据管理标签页组件
interface DataManagementTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  milestones: StrategicMilestone[];
  goals: StrategicGoal[];
  events: ProjectEvent[];
  documents: ProjectDocument[];
  meetings: ProjectMeeting[];
  goalMetrics: Record<string, GoalMetric[]>;
  onEditMilestone: (m: StrategicMilestone) => void;
  onDeleteMilestone: (id: string) => void;
  onAddMilestone: () => void;
  onAutoGenerateMilestones?: () => void;
  onUpdateMilestoneStatus: (milestoneId: string, status: 'pending' | 'in-progress' | 'completed') => void;
  onEditGoal: (g: StrategicGoal) => void;
  onDeleteGoal: (id: string) => void;
  onAddGoal: () => void;
  onEditEvent: (e: ProjectEvent) => void;
  onDeleteEvent: (id: string) => void;
  onAddEvent: () => void;
  onEditDocument: (d: ProjectDocument) => void;
  onDeleteDocument: (id: string) => void;
  onAddDocument: () => void;
  onEditMeeting: (m: ProjectMeeting) => void;
  onDeleteMeeting: (id: string) => void;
  onAddMeeting: () => void;
}

const DataManagementTabs: React.FC<DataManagementTabsProps> = ({
  activeTab,
  onTabChange,
  milestones,
  goals,
  events,
  documents,
  meetings,
  goalMetrics,
  onEditMilestone,
  onDeleteMilestone,
  onAddMilestone,
  onAutoGenerateMilestones,
  onUpdateMilestoneStatus,
  onEditGoal,
  onDeleteGoal,
  onAddGoal,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
  onEditDocument,
  onDeleteDocument,
  onAddDocument,
  onEditMeeting,
  onDeleteMeeting,
  onAddMeeting,
}) => {
  const tabs = [
    { id: 'milestones', label: '里程碑', count: milestones.length },
    { id: 'goals', label: '本季度重点目标', count: goals.length },
    { id: 'events', label: '事件', count: events.length },
    { id: 'documents', label: '文档', count: documents.length },
    { id: 'meetings', label: '会议', count: meetings.length },
  ];

  return (
    <div className="mt-6">
      {/* 标签页导航 */}
      <div className="flex items-center gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
              activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* 里程碑管理 */}
        {activeTab === 'milestones' && (
          <div className="p-6">
            <div className="flex items-center justify-end gap-3 mb-4">
              {milestones.length === 0 && onAutoGenerateMilestones && (
                <button
                  onClick={onAutoGenerateMilestones}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                  title="按默认战略陪伴阶段（5阶段）一键生成里程碑"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 0v4m0-4h4m-4 0H8" />
                  </svg>
                  一键生成阶段里程碑
                </button>
              )}
              <button
                onClick={onAddMilestone}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加里程碑
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">阶段</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">核心目标</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">交付物</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {milestones.map((milestone) => {
                    const currentStatus = milestone.status || 'pending';

                    return (
                      <tr key={milestone.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">第 {milestone.phaseOrder} 阶段</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{milestone.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{milestone.coreGoal || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{milestone.deliverable || '-'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={currentStatus}
                            onChange={(e) => {
                              const newStatus = e.target.value as 'pending' | 'in-progress' | 'completed';
                              console.log('🎯 用户选择状态:', {
                                milestoneId: milestone.id,
                                milestoneTitle: milestone.title,
                                oldStatus: currentStatus,
                                newStatus: newStatus,
                              });
                              onUpdateMilestoneStatus(milestone.id, newStatus);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${
                              currentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              currentStatus === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <option value="pending">待开始</option>
                            <option value="in-progress">进行中</option>
                            <option value="completed">已完成</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => onEditMilestone(milestone)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => onDeleteMilestone(milestone.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 目标管理 */}
        {activeTab === 'goals' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={onAddGoal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加目标
              </button>
            </div>
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="border rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{goal.title}</h4>
                      {goal.quarter && (
                        <span className="text-sm text-gray-500">{goal.quarter}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditGoal(goal)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">进度</span>
                      <span className="font-medium">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(goalMetrics[goal.id] || []).map((metric) => (
                      <div key={metric.id} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                        {metric.label}: {metric.value || 0}/{metric.target} {metric.unit}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 事件管理 */}
        {activeTab === 'events' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={onAddEvent}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加事件
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          event.type === 'meeting' ? 'bg-blue-100 text-blue-700' :
                          event.type === 'deliverable' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {event.type === 'meeting' ? '会议' : event.type === 'deliverable' ? '交付物' : '里程碑'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{event.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{event.eventDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditEvent(event)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => onDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 文档管理 */}
        {activeTab === 'documents' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={onAddDocument}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加文档
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">格式</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">密码保护</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          doc.category === 'assessment' ? 'bg-yellow-100 text-yellow-700' :
                          doc.category === 'strategy' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {doc.category === 'assessment' ? '诊断报告' : doc.category === 'strategy' ? '战略文档' : '工具'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{doc.title}</span>
                          <div className="flex items-center gap-1">
                            {doc.fileUrl && (
                              <span title="已上传文件" className="text-blue-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </span>
                            )}
                            {doc.documentLink && (
                              <a 
                                href={doc.documentLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title="外部链接"
                                className="text-green-500 hover:text-green-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{doc.docDate || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 uppercase">{doc.fileType || '-'}</td>
                      <td className="px-4 py-3">
                        {doc.passwordProtected ? (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
                              已加密 {doc.password ? `(${doc.password})` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">未加密</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditDocument(doc)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 会议管理 */}
        {activeTab === 'meetings' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={onAddMeeting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加会议
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">会议标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时长</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">参与人数</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">密码保护</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {meetings.map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{meeting.title}</span>
                          <div className="flex items-center gap-1">
                            {meeting.attachmentUrl && (
                              <span title="已上传附件" className="text-blue-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </span>
                            )}
                            {meeting.meetingLink && (
                              <a 
                                href={meeting.meetingLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title="会议链接"
                                className="text-green-500 hover:text-green-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(meeting.meetingDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{meeting.duration || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{meeting.participantsCount || '-'}</td>
                      <td className="px-4 py-3">
                        {meeting.passwordProtected ? (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
                              已加密 {meeting.password ? `(${meeting.password})` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">未加密</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditMeeting(meeting)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => onDeleteMeeting(meeting.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// 弹窗组件（简化版本）
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};


const parseClientStrategyPaste = (raw: string): {
  mission?: string;
  vision?: string;
  values?: string[];
  milestones?: string[];
} => {
  const input = (raw || '').replace(/\r\n/g, '\n').trim();
  if (!input) return {};

  // Support both "multi-line doc" and "inline single-line" paste.
  // Many users paste like: "使命:...愿景:...价值观:..." without line breaks.
  const normalizedInline = input.replace(/\s+/g, ' ').trim();

  const lines = input
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  const cleanBullet = (s: string) =>
    s
      .replace(/^[\u2022\u25CF\u25A0\-\*\+]+\s*/, '')
      .replace(/^\(?\d+\)?[\.、\)]\s*/, '')
      .replace(/^（\d+）\s*/, '')
      .trim();

  const takeAfterColon = (line: string) => {
    const m = line.match(/[:：]\s*(.+)$/);
    return m?.[1]?.trim() || '';
  };

  const headingMatchers = {
    mission: [/使命/i, /\bmission\b/i],
    vision: [/愿景/i, /\bvision\b/i],
    values: [/价值观/i, /核心价值观/i, /\bvalues\b/i],
    milestones: [/里程碑/i, /\bmilestones?\b/i, /阶段/i],
  } as const;

  const isHeadingLine = (line: string) => {
    const t = line.trim();
    const patterns = [
      ...headingMatchers.mission,
      ...headingMatchers.vision,
      ...headingMatchers.values,
      ...headingMatchers.milestones,
    ];
    return patterns.some(r => r.test(t));
  };

  const extractSection = (patterns: readonly RegExp[]) => {
    const idx = lines.findIndex(l => patterns.some(r => r.test(l)));
    if (idx === -1) return '';

    const sameLine = takeAfterColon(lines[idx]);
    if (sameLine) return sameLine;

    const collected: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (isHeadingLine(line)) break;
      collected.push(line);
    }
    return collected.join('\n').trim();
  };

  const extractInlineBetween = (startLabels: string[], endLabels: string[]) => {
    const start = startLabels.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const end = endLabels.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const re = new RegExp(`(?:^|[\n\r\t\s])(?:${start})\s*[:：]\s*([\\s\\S]*?)(?=(?:${end})\s*[:：]|$)`, 'i');
    const m = normalizedInline.match(re);
    return (m?.[1] || '').trim();
  };

  const missionInline = extractInlineBetween(['使命', 'Mission'], ['愿景', 'Vision', '价值观', 'Values', '核心价值观', '里程碑', 'Milestone', '阶段']);
  const visionInline = extractInlineBetween(['愿景', 'Vision'], ['使命', 'Mission', '价值观', 'Values', '核心价值观', '里程碑', 'Milestone', '阶段']);
  const valuesInline = extractInlineBetween(['价值观', '核心价值观', 'Values'], ['使命', 'Mission', '愿景', 'Vision', '里程碑', 'Milestone', '阶段']);
  const milestonesInline = extractInlineBetween(['里程碑', 'Milestone', '阶段', 'Milestones'], ['使命', 'Mission', '愿景', 'Vision', '价值观', 'Values', '核心价值观']);

  const mission = missionInline || extractSection(headingMatchers.mission);
  const vision = visionInline || extractSection(headingMatchers.vision);

  const valuesText = valuesInline || extractSection(headingMatchers.values);
  const values = valuesText
    ? valuesText
        .split(/[\n,，、；;\/\|]+/)
        .map(s => cleanBullet(s))
        .filter(Boolean)
        .slice(0, 8)
    : undefined;

  const milestonesText = milestonesInline || extractSection(headingMatchers.milestones);
  const milestones = milestonesText
    ? milestonesText
        .split(/\n+/)
        .map(s => cleanBullet(s))
        .filter(Boolean)
        .filter(s => s.length >= 2)
        .slice(0, 10)
    : undefined;

  return {
    mission: mission || undefined,
    vision: vision || undefined,
    values: values && values.length ? values : undefined,
    milestones: milestones && milestones.length ? milestones : undefined,
  };
};

const AdminStrategyCompanionPage: React.FC = () => {
  // 状态管理
  const [selectedClient, setSelectedClient] = useState<ClientProject | null>(null);
  const [activeTab, setActiveTab] = useState<string>('milestones');
  const [clients, setClients] = useState<ClientProject[]>([]);
  
  // 里程碑数据
  const [milestones, setMilestones] = useState<StrategicMilestone[]>([]);
  const [editingMilestone, setEditingMilestone] = useState<StrategicMilestone | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  
  // 目标数据
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [goalMetrics, setGoalMetrics] = useState<Record<string, GoalMetric[]>>({});
  const [editingGoal, setEditingGoal] = useState<StrategicGoal | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  
  // 事件数据
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<ProjectEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  
  // 文档数据
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  // 会议数据
  const [meetings, setMeetings] = useState<ProjectMeeting[]>([]);
  const [editingMeeting, setEditingMeeting] = useState<ProjectMeeting | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // 客户项目数据
  const [editingProject, setEditingProject] = useState<ClientProject | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // 客户编辑表单（用于“粘贴自动识别”）
  const [clientForm, setClientForm] = useState({
    clientName: '',
    startDate: '',
    endDate: '',
    status: 'active' as 'active' | 'completed' | 'paused',
    description: '',
    mission: '',
    vision: '',
    valuesText: '',
    pasteText: '',
  });
  const [parsedMilestoneTitles, setParsedMilestoneTitles] = useState<string[]>([]);
  const [applyParsedMilestones, setApplyParsedMilestones] = useState(true);

  useEffect(() => {
    if (!showProjectModal) return;
    setClientForm({
      clientName: editingProject?.clientName || '',
      startDate: editingProject?.startDate || '',
      endDate: editingProject?.endDate || '',
      status: (editingProject?.status || 'active') as 'active' | 'completed' | 'paused',
      description: editingProject?.description || '',
      mission: editingProject?.mission || '',
      vision: editingProject?.vision || '',
      valuesText: (editingProject?.values || []).join('，'),
      pasteText: '',
    });
    setParsedMilestoneTitles([]);
    setApplyParsedMilestones(true);
  }, [showProjectModal, editingProject]);

  // 加载数据
  // 1) 加载客户列表
  useEffect(() => {
    const loadClients = async () => {
      const projects = await getClientProjects();
      setClients(projects);
      if (projects.length > 0 && !selectedClient) {
        setSelectedClient(projects[0]);
      }
    };

    loadClients();

    const onChange = () => loadClients();
    window.addEventListener('yiyu_data_change', onChange);
    window.addEventListener('storage', onChange);

    return () => {
      window.removeEventListener('yiyu_data_change', onChange);
      window.removeEventListener('storage', onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) 加载当前客户的数据（全部按 projectId 隔离）
  useEffect(() => {
    if (!selectedClient?.id) {
      setMilestones([]);
      setGoals([]);
      setEvents([]);
      setDocuments([]);
      setMeetings([]);
      setGoalMetrics({});
      return;
    }

    const projectId = selectedClient.id;
    let canceled = false;

    const loadProjectData = async () => {
      const [milesData, goalsData, eventsData, docsData, meetingsData] = await Promise.all([
        getStrategicMilestones(projectId),
        getStrategicGoals(projectId),
        getProjectEvents(projectId),
        getProjectDocuments(projectId),
        getProjectMeetings(projectId),
      ]);

      if (canceled) return;

      setMilestones(milesData);
      setGoals(goalsData);
      setEvents(eventsData);
      setDocuments(docsData);
      setMeetings(meetingsData);

      // 加载当前客户目标的指标
      const metricsResults = await Promise.all(
        goalsData.map(async (goal) => ({ goalId: goal.id, metrics: await getGoalMetrics(goal.id) }))
      );
      const metricsMap = metricsResults.reduce((acc, { goalId, metrics }) => {
        acc[goalId] = metrics;
        return acc;
      }, {} as Record<string, GoalMetric[]>);
      setGoalMetrics(metricsMap);
    };

    loadProjectData();

    const onChange = () => loadProjectData();
    window.addEventListener('yiyu_data_change', onChange);
    window.addEventListener('storage', onChange);

    return () => {
      canceled = true;
      window.removeEventListener('yiyu_data_change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [selectedClient?.id]);
  
  // 选择客户
  const handleSelectClient = (client: ClientProject) => {
    setSelectedClient(client);
  };
  
  // 添加客户
  const handleAddClient = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };
  
  // 编辑客户
  const handleEditClient = (client: ClientProject) => {
    setEditingProject(client);
    setShowProjectModal(true);
  };
  
  // 一键生成默认战略陪伴阶段里程碑（5阶段）
  const handleAutoGenerateMilestones = async () => {
    if (!selectedClient?.id) return;
    const projectId = selectedClient.id;

    const templates: Array<Pick<StrategicMilestone, 'title' | 'phaseOrder' | 'coreGoal' | 'deliverable'>> = [
      { title: '战略启动', phaseOrder: 1, coreGoal: '明确战略方向和项目范围', deliverable: '战略启动报告' },
      { title: '能力诊断', phaseOrder: 2, coreGoal: '全面评估组织现状和能力', deliverable: '能力诊断报告' },
      { title: '战略共创', phaseOrder: 3, coreGoal: '制定战略规划和实施路径', deliverable: '战略规划书' },
      { title: '执行赋能', phaseOrder: 4, coreGoal: '支持战略落地和执行', deliverable: '执行手册和培训材料' },
      { title: '复盘迭代', phaseOrder: 5, coreGoal: '评估成效并持续优化', deliverable: '复盘报告和优化方案' },
    ];

    const existing = await getStrategicMilestones(projectId);
    if (existing.length > 0) {
      alert('当前客户已存在里程碑，已取消一键生成（避免重复）。');
      return;
    }

    const ok = window.confirm('将按默认“战略陪伴 5 阶段”自动生成里程碑（可后续编辑/删除）。是否继续？');
    if (!ok) return;

    await Promise.all(
      templates.map((t, idx) =>
        saveStrategicMilestone({
          projectId,
          title: t.title,
          description: '',
          status: 'pending',
          phaseOrder: t.phaseOrder,
          coreGoal: t.coreGoal,
          deliverable: t.deliverable,
          participants: [],
          outputs: [],
          milestoneDate: undefined,
          sortOrder: idx,
          isActive: true,
        })
      )
    );

    // Refresh list
    const next = await getStrategicMilestones(projectId);
    setMilestones(next);
    setActiveTab('milestones');
  };

  // 保存客户项目
  const handleSaveProject = async (data: Partial<ClientProject>) => {
    try {
      const saved = await saveClientProject(data as ClientProject);
      if (saved) {
        setClients(prev => 
          data.id 
            ? prev.map(p => p.id === data.id ? saved : p)
            : [...prev, saved]
        );
        
        // 粘贴自动识别：可选地把识别出的里程碑写入该客户
        if (applyParsedMilestones && parsedMilestoneTitles.length > 0) {
          try {
            const existing = await getStrategicMilestones(saved.id);
            const existingTitles = new Set((existing || []).map(m => (m.title || '').trim()).filter(Boolean));
            const toCreate = parsedMilestoneTitles
              .map(t => (t || '').trim())
              .filter(Boolean)
              .filter(t => !existingTitles.has(t));

            await Promise.all(
              toCreate.map((title, i) =>
                saveStrategicMilestone({
                  projectId: saved.id,
                  title,
                  description: '',
                  status: 'pending',
                  phaseOrder: (existing?.length || 0) + i + 1,
                  coreGoal: '',
                  deliverable: '',
                  participants: [],
                  outputs: [],
                  milestoneDate: undefined,
                  sortOrder: (existing?.length || 0) + i,
                  isActive: true,
                } as any)
              )
            );
          } catch (e) {
            console.warn('自动添加里程碑失败（已忽略）:', e);
          }
        }

        //（Iteration2）项目状态变化不再联动里程碑（里程碑已按客户独立维护）
        setShowProjectModal(false);
        setEditingProject(null);
        // 如果是新添加的客户，自动选中
        if (!data.id) {
          setSelectedClient(saved);
        }
      } else {
        alert('保存失败：请检查表单数据是否正确，或者联系管理员检查数据库权限');
      }
    } catch (error) {
      console.error('保存客户项目失败:', error);
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };
  
  // 里程碑操作
  const handleSaveMilestone = async (data: Partial<StrategicMilestone>) => {
    if (!selectedClient) {
      alert('请先选择一个客户');
      return;
    }
    const saved = await saveStrategicMilestone({
      ...data,
      projectId: data.projectId || selectedClient.id,
    } as StrategicMilestone);
    if (saved) {
      setMilestones(prev => 
        data.id 
          ? prev.map(m => m.id === data.id ? saved : m)
          : [...prev, saved]
      );
      
      setShowMilestoneModal(false);
      setEditingMilestone(null);
    }
  };
  
  // 直接更新里程碑状态（用于表格下拉菜单）
  const handleUpdateMilestoneStatus = async (milestoneId: string, status: 'pending' | 'in-progress' | 'completed') => {
    const updated = await saveStrategicMilestone({ id: milestoneId, status });
    if (updated) {
      setMilestones(prev => prev.map(m => (m.id === milestoneId ? updated : m)));
    }
  };
  
  const handleDeleteMilestone = async (id: string) => {
    if (window.confirm('确定要删除这个里程碑吗？')) {
      const success = await deleteStrategicMilestone(id);
      if (success) {
        setMilestones(prev => prev.filter(m => m.id !== id));
      }
    }
  };
  
  // 目标操作
  const handleSaveGoal = async (data: Partial<StrategicGoal>) => {
    if (!selectedClient) {
      alert('请先选择一个客户');
      return;
    }
    const saved = await saveStrategicGoal({
      ...data,
      projectId: data.projectId || selectedClient.id,
    } as StrategicGoal);
    if (saved) {
      setGoals(prev => 
        data.id 
          ? prev.map(g => g.id === data.id ? saved : g)
          : [...prev, saved]
      );
      setShowGoalModal(false);
      setEditingGoal(null);
    }
  };
  
  const handleDeleteGoal = async (id: string) => {
    if (window.confirm('确定要删除这个目标吗？')) {
      const success = await deleteStrategicGoal(id);
      if (success) {
        setGoals(prev => prev.filter(g => g.id !== id));
      }
    }
  };
  
  // 事件操作
  const handleSaveEvent = async (data: Partial<ProjectEvent>) => {
    if (!selectedClient) {
      alert('请先选择一个客户');
      return;
    }
    const saved = await saveProjectEvent({
      ...data,
      projectId: data.projectId || selectedClient.id,
    } as ProjectEvent);
    if (saved) {
      setEvents(prev => 
        data.id 
          ? prev.map(e => e.id === data.id ? saved : e)
          : [...prev, saved]
      );
      setShowEventModal(false);
      setEditingEvent(null);
    }
  };
  
  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('确定要删除这个事件吗？')) {
      const success = await deleteProjectEvent(id);
      if (success) {
        setEvents(prev => prev.filter(e => e.id !== id));
      }
    }
  };
  
  // 文档操作
  const handleSaveDocument = async (data: Partial<ProjectDocument>) => {
    if (!selectedClient) {
      alert('请先选择一个客户');
      return;
    }
    const saved = await saveProjectDocument({
      ...data,
      projectId: data.projectId || selectedClient.id,
    } as ProjectDocument);
    if (saved) {
      setDocuments(prev => 
        data.id 
          ? prev.map(d => d.id === data.id ? saved : d)
          : [...prev, saved]
      );
      setShowDocumentModal(false);
      setEditingDocument(null);
    }
  };
  
  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('确定要删除这个文档吗？')) {
      const success = await deleteProjectDocument(id);
      if (success) {
        setDocuments(prev => prev.filter(d => d.id !== id));
      }
    }
  };
  
  // 会议操作
  const handleSaveMeeting = async (data: Partial<ProjectMeeting>) => {
    if (!selectedClient) {
      alert('请先选择一个客户');
      return;
    }
    const saved = await saveProjectMeeting({
      ...data,
      projectId: data.projectId || selectedClient.id,
    } as ProjectMeeting);
    if (saved) {
      setMeetings(prev => 
        data.id 
          ? prev.map(m => m.id === data.id ? saved : m)
          : [...prev, saved]
      );
      setShowMeetingModal(false);
      setEditingMeeting(null);
    }
  };
  
  const handleDeleteMeeting = async (id: string) => {
    if (window.confirm('确定要删除这个会议吗？')) {
      const success = await deleteProjectMeeting(id);
      if (success) {
        setMeetings(prev => prev.filter(m => m.id !== id));
      }
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">战略客户管理</h1>
        <p className="text-gray-600 mt-1">管理多个战略咨询项目的进度和数据</p>
      </div>
      
      <div className="flex gap-6">
        {/* 左侧：客户选择器 */}
        <div className="w-80 flex-shrink-0">
          <ClientSelector
            clients={clients}
            selectedClient={selectedClient}
            onSelectClient={handleSelectClient}
            onAddClient={handleAddClient}
            onEditClient={handleEditClient}
          />
          
          {/* 快速统计 */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-3">统计概览</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">客户总数</span>
                <span className="font-medium">{clients.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">进行中</span>
                <span className="font-medium text-green-600">
                  {clients.filter(c => c.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">已完成</span>
                <span className="font-medium text-blue-600">
                  {clients.filter(c => c.status === 'completed').length}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧：项目详情 */}
        <div className="flex-1">
          {selectedClient ? (
            <>
              {/* 项目概览 */}
              <ProjectOverview
                client={selectedClient}
                milestones={milestones}
                goals={goals}
                goalMetrics={goalMetrics}
                onAutoGenerateMilestones={handleAutoGenerateMilestones}
              />
              
              {/* 数据管理标签页 */}
              <DataManagementTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                milestones={milestones}
                goals={goals}
                events={events}
                documents={documents}
                meetings={meetings}
                goalMetrics={goalMetrics}
                onEditMilestone={(m) => {
                  setEditingMilestone(m);
                  setShowMilestoneModal(true);
                }}
                onDeleteMilestone={handleDeleteMilestone}
                onAddMilestone={() => {
                  setEditingMilestone(null);
                  setShowMilestoneModal(true);
                }}
                onAutoGenerateMilestones={handleAutoGenerateMilestones}
                onUpdateMilestoneStatus={handleUpdateMilestoneStatus}
                onEditGoal={(g) => {
                  setEditingGoal(g);
                  setShowGoalModal(true);
                }}
                onDeleteGoal={handleDeleteGoal}
                onAddGoal={() => {
                  setEditingGoal(null);
                  setShowGoalModal(true);
                }}
                onEditEvent={(e) => {
                  setEditingEvent(e);
                  setShowEventModal(true);
                }}
                onDeleteEvent={handleDeleteEvent}
                onAddEvent={() => {
                  setEditingEvent(null);
                  setShowEventModal(true);
                }}
                onEditDocument={(d) => {
                  setEditingDocument(d);
                  setShowDocumentModal(true);
                }}
                onDeleteDocument={handleDeleteDocument}
                onAddDocument={() => {
                  setEditingDocument(null);
                  setShowDocumentModal(true);
                }}
                onEditMeeting={(m) => {
                  setEditingMeeting(m);
                  setShowMeetingModal(true);
                }}
                onDeleteMeeting={handleDeleteMeeting}
                onAddMeeting={() => {
                  setEditingMeeting(null);
                  setShowMeetingModal(true);
                }}
              />
            </>
          ) : (
            /* 空状态 */
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无客户项目</h3>
              <p className="text-gray-500 mb-4">请添加第一个战略陪伴客户开始管理</p>
              <button
                onClick={handleAddClient}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                添加客户
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 里程碑编辑弹窗 */}
      <Modal
        isOpen={showMilestoneModal}
        onClose={() => {
          setShowMilestoneModal(false);
          setEditingMilestone(null);
        }}
        title={editingMilestone ? '编辑里程碑' : '添加里程碑'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSaveMilestone({
              id: editingMilestone?.id,
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              phaseOrder: parseInt(formData.get('phaseOrder') as string) || 1,
              coreGoal: formData.get('coreGoal') as string,
              deliverable: formData.get('deliverable') as string,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              name="title"
              defaultValue={editingMilestone?.title}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">阶段序号</label>
              <input
                name="phaseOrder"
                type="number"
                defaultValue={editingMilestone?.phaseOrder || 1}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {/* 状态字段已移除，现在在表格中直接修改 */}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">核心目标</label>
            <textarea
              name="coreGoal"
              defaultValue={editingMilestone?.coreGoal}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">交付物</label>
            <input
              name="deliverable"
              defaultValue={editingMilestone?.deliverable}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowMilestoneModal(false);
                setEditingMilestone(null);
              }}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </Modal>
      
      {/* 目标编辑弹窗 */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        title={editingGoal ? '编辑目标' : '添加目标'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const goalAttachment = formData.get('goalAttachment') as File;
            
            // 处理附件上传（模拟URL，实际项目中需要上传到服务器）
let attachmentUrl = editingGoal?.attachmentUrl;
            if (goalAttachment && goalAttachment.size > 0) {
              // TODO: 实际项目中应上传到服务器或云存储
              attachmentUrl = `https://storage.example.com/goals/${goalAttachment.name}`;
              console.log('模拟目标附件上传:', goalAttachment.name, '大小:', goalAttachment.size);
            }
            
            handleSaveGoal({
              id: editingGoal?.id,
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              quarter: formData.get('quarter') as string,
              progress: parseInt(formData.get('progress') as string) || 0,
              attachmentUrl: attachmentUrl,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标标题</label>
            <input
              name="title"
              defaultValue={editingGoal?.title}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">季度</label>
              <input
                name="quarter"
                defaultValue={editingGoal?.quarter}
                placeholder="如: 2024-Q1"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">进度 (%)</label>
              <input
                name="progress"
                type="number"
                min="0"
                max="100"
                defaultValue={editingGoal?.progress || 0}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              defaultValue={editingGoal?.description}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 文件上传区域 */}
          <div className="border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📎 上传目标方法文档
              </label>
              <input
                type="file"
                name="goalAttachment"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">上传达成此目标的方法论文档（PDF、Word、PPT等）</p>
              {editingGoal?.attachmentUrl && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓ 已有附件</span>
                  <a href={editingGoal.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    查看
                  </a>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowGoalModal(false);
                setEditingGoal(null);
              }}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </Modal>
      
      {/* 事件编辑弹窗 */}
      <Modal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        title={editingEvent ? '编辑事件' : '添加事件'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            // 处理文件上传
            const eventFile = formData.get('eventFile') as File;
            let eventFileUrl = editingEvent?.eventFileUrl;
            if (eventFile && eventFile.size > 0) {
              eventFileUrl = `https://storage.example.com/events/${eventFile.name}`;
            }
            
            handleSaveEvent({
              id: editingEvent?.id,
              type: formData.get('type') as 'meeting' | 'deliverable' | 'milestone',
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              eventDate: formData.get('eventDate') as string,
              eventFileUrl: eventFileUrl,
              eventLink: formData.get('eventLink') as string || undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
<label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select
                name="type"
                defaultValue={editingEvent?.type || 'meeting'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="meeting">会议</option>
                <option value="deliverable">交付物</option>
                <option value="milestone">里程碑</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input
                name="eventDate"
                type="date"
                defaultValue={editingEvent?.eventDate}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              name="title"
              defaultValue={editingEvent?.title}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              defaultValue={editingEvent?.description}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 文件上传和外部链接区域 */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📎 上传事件文件
              </label>
              <input
                type="file"
                name="eventFile"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">上传与该事件相关的文档（PDF、Word、PPT等）</p>
              {editingEvent?.eventFileUrl && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓ 已有文件</span>
                  <a href={editingEvent.eventFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    查看
                  </a>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔗 外部链接
              </label>
              <input
                type="url"
                name="eventLink"
                defaultValue={editingEvent?.eventLink || ''}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">如会议链接、在线文档等外部资源链接</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEventModal(false);
                setEditingEvent(null);
              }}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </Modal>
      
      {/* 文档编辑弹窗 */}
      <Modal
        isOpen={showDocumentModal}
        onClose={() => {
          setShowDocumentModal(false);
          setEditingDocument(null);
        }}
        title={editingDocument ? '编辑文档' : '添加文档'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const passwordProtected = formData.get('passwordProtected') === 'on';
            const documentFile = formData.get('documentFile') as File;
            
            // 处理文件上传（模拟URL，实际项目中需要上传到服务器）
            let fileUrl = editingDocument?.fileUrl;
            if (documentFile && documentFile.size > 0) {
              // TODO: 实际项目中应上传到服务器或云存储
              fileUrl = `https://storage.example.com/documents/${documentFile.name}`;
              console.log('模拟文件上传:', documentFile.name, '大小:', documentFile.size);
            }
            
            handleSaveDocument({
              id: editingDocument?.id,
              category: formData.get('category') as 'assessment' | 'strategy' | 'tools',
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              docDate: formData.get('docDate') as string,
              fileType: formData.get('fileType') as 'pdf' | 'ppt' | 'xlsx' | 'doc' | undefined,
              fileUrl: fileUrl,
              documentLink: formData.get('documentLink') as string || undefined,
              passwordProtected: passwordProtected,
              password: passwordProtected ? (formData.get('password') as string) : undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                name="category"
                defaultValue={editingDocument?.category || 'assessment'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="assessment">诊断报告</option>
                <option value="strategy">战略文档</option>
                <option value="tools">工具</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文件格式</label>
              <select
                name="fileType"
                defaultValue={editingDocument?.fileType || ''}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">无</option>
                <option value="pdf">PDF</option>
                <option value="ppt">PPT</option>
                <option value="xlsx">Excel</option>
                <option value="doc">Word</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">文档标题</label>
            <input
              name="title"
              defaultValue={editingDocument?.title}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              name="docDate"
              type="date"
              defaultValue={editingDocument?.docDate}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 文件上传和链接区域 */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📎 上传文档文件
              </label>
              <input
                type="file"
                name="documentFile"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">支持格式：PDF、Word、PPT、Excel</p>
              {editingDocument?.fileUrl && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓ 已有文件</span>
                  <a href={editingDocument.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    查看
                  </a>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔗 或提供外部文档链接
              </label>
              <input
                type="url"
                name="documentLink"
                defaultValue={editingDocument?.documentLink || ''}
                placeholder="https://example.com/document.pdf"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">如果有外部文档链接（如腾讯文档、石墨文档等），可以在此填写</p>
            </div>
          </div>
          
          {/* 密码保护选项 */}
          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="passwordProtected"
                id="doc-password-protected"
                defaultChecked={editingDocument?.passwordProtected || false}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">启用密码保护</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">启用后，客户下载此文档时需要输入密码</p>
            
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">下载密码</label>
              <input
                type="text"
                name="password"
                id="doc-password-input"
                defaultValue={editingDocument?.password || ''}
                placeholder="请设置6位数字密码（例如：123456）"
                maxLength={6}
                pattern="[0-9]{6}"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">密码为6位数字</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowDocumentModal(false);
                setEditingDocument(null);
              }}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </Modal>
      
      {/* 会议编辑弹窗 */}
      <Modal
        isOpen={showMeetingModal}
        onClose={() => {
          setShowMeetingModal(false);
          setEditingMeeting(null);
        }}
        title={editingMeeting ? '编辑会议' : '添加会议'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const passwordProtected = formData.get('passwordProtected') === 'on';
            const meetingAttachment = formData.get('meetingAttachment') as File;
            
            // 处理附件上传（模拟URL，实际项目中需要上传到服务器）
            let attachmentUrl = editingMeeting?.attachmentUrl;
            if (meetingAttachment && meetingAttachment.size > 0) {
              // TODO: 实际项目中应上传到服务器或云存储
              attachmentUrl = `https://storage.example.com/meetings/${meetingAttachment.name}`;
              console.log('模拟附件上传:', meetingAttachment.name, '大小:', meetingAttachment.size);
            }
            
            handleSaveMeeting({
              id: editingMeeting?.id,
              title: formData.get('title') as string,
              meetingDate: formData.get('meetingDate') as string,
              duration: formData.get('duration') as string,
              participantsCount: parseInt(formData.get('participantsCount') as string) || undefined,
              attachmentUrl: attachmentUrl,
              meetingLink: formData.get('meetingLink') as string || undefined,
              passwordProtected: passwordProtected,
              password: passwordProtected ? (formData.get('password') as string) : undefined,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">会议标题</label>
            <input
              name="title"
              defaultValue={editingMeeting?.title}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input
                name="meetingDate"
                type="date"
                defaultValue={editingMeeting?.meetingDate?.split('T')[0]}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">时长</label>
              <input
                name="duration"
                defaultValue={editingMeeting?.duration}
                placeholder="如: 90分钟"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">参与人数</label>
              <input
                name="participantsCount"
                type="number"
                defaultValue={editingMeeting?.participantsCount}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* 附件上传和会议链接区域 */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📎 上传会议记录附件
              </label>
              <input
                type="file"
                name="meetingAttachment"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">支持格式：PDF、Word、PPT（会议纪要、会议记录等）</p>
              {editingMeeting?.attachmentUrl && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓ 已有附件</span>
                  <a href={editingMeeting.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    查看
                  </a>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔗 会议链接
              </label>
              <input
                type="url"
                name="meetingLink"
                defaultValue={editingMeeting?.meetingLink || ''}
                placeholder="https://meeting.tencent.com/xxx 或 https://zoom.us/xxx"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">会议回放链接、腾讯会议链接、Zoom链接等</p>
            </div>
          </div>
          
          {/* 密码保护选项 */}
          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="passwordProtected"
                id="meeting-password-protected"
                defaultChecked={editingMeeting?.passwordProtected || false}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">启用密码保护</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">启用后，客户下载此会议记录时需要输入密码</p>
            
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">下载密码</label>
              <input
                type="text"
                name="password"
                id="meeting-password-input"
                defaultValue={editingMeeting?.password || ''}
                placeholder="请设置6位数字密码（例如：123456）"
                maxLength={6}
                pattern="[0-9]{6}"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">密码为6位数字</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowMeetingModal(false);
                setEditingMeeting(null);
              }}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </Modal>
      
      {/* 客户项目编辑弹窗 */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        title={editingProject ? '编辑客户' : '添加客户'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const submitData: Partial<ClientProject> = {
              id: editingProject?.id,
              clientName: clientForm.clientName,
              startDate: clientForm.startDate || undefined,
              endDate: clientForm.endDate || undefined,
              status: clientForm.status,
              description: clientForm.description,
              mission: clientForm.mission || undefined,
              vision: clientForm.vision || undefined,
              values: String(clientForm.valuesText || '')
                .split(/[,，\n]/)
                .map(s => s.trim())
                .filter(Boolean)
                .slice(0, 8),
            };
            handleSaveProject(submitData);
          }}

          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客户名称</label>
            <input
              name="clientName"
              value={clientForm.clientName}
              onChange={(e) => setClientForm(prev => ({ ...prev, clientName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="请输入客户名称"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                name="startDate"
                type="date"
                value={clientForm.startDate}
                onChange={(e) => setClientForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                name="endDate"
                type="date"
                value={clientForm.endDate}
                onChange={(e) => setClientForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              name="status"
              value={clientForm.status}
              onChange={(e) => setClientForm(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">进行中</option>
              <option value="completed">已完成</option>
              <option value="paused">已暂停</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              value={clientForm.description}
              onChange={(e) => setClientForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="请输入客户描述"
            />
          </div>



          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">粘贴自动识别</label>
              <button
                type="button"
                onClick={() => {
                  const parsed = parseClientStrategyPaste(clientForm.pasteText);
                  setClientForm(prev => ({
                    ...prev,
                    mission: parsed.mission ?? prev.mission,
                    vision: parsed.vision ?? prev.vision,
                    valuesText: parsed.values?.join('，') ?? prev.valuesText,
                  }));
                  setParsedMilestoneTitles(parsed.milestones || []);
                }}
                className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-gray-100"
              >
                识别并填充
              </button>
            </div>
            <textarea
              value={clientForm.pasteText}
              onChange={(e) => setClientForm(prev => ({ ...prev, pasteText: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="把客户的战略材料粘贴到这里（包含 Mission / Vision / Values / 里程碑等），点击“识别并填充”即可自动拆分到下方字段。"
            />
            {parsedMilestoneTitles.length > 0 && (
              <div className="mt-2">
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={applyParsedMilestones}
                    onChange={(e) => setApplyParsedMilestones(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>保存时自动添加识别出的里程碑（{parsedMilestoneTitles.length} 条）</span>
                </label>
                <ul className="mt-1 list-disc pl-5 text-xs text-gray-600">
                  {parsedMilestoneTitles.slice(0, 5).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mission（使命）</label>
            <textarea
              name="mission"
              value={clientForm.mission}
              onChange={(e) => setClientForm(prev => ({ ...prev, mission: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="请输入使命（前台 Mission 区域展示）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vision（愿景）</label>
            <textarea
              name="vision"
              value={clientForm.vision}
              onChange={(e) => setClientForm(prev => ({ ...prev, vision: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="请输入愿景（前台 Vision 区域展示）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Values（价值观标签）</label>
            <textarea
              name="values"
              value={clientForm.valuesText}
              onChange={(e) => setClientForm(prev => ({ ...prev, valuesText: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="用逗号/中文逗号/换行分隔，例如：深度陪伴，系统思维，价值共创，长期主义"
            />
            <p className="text-xs text-gray-500 mt-1">建议 4 个标签；最多取前 8 个</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowProjectModal(false);
                setEditingProject(null);
              }}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AdminStrategyCompanionPage;
