/**
 * 本地数据服务层（Iteration 2: client-specific strategy companion）
 * 使用 localStorage 进行数据存储，用于本地开发和测试。
 *
 * 关键原则（见 AI_SPEC.md）：
 * - 所有客户专属实体必须包含 projectId
 * - 前台展示必须按 selected clientId 过滤
 */

import { v4 as uuidv4 } from 'uuid';

// ================================================
// Types
// ================================================

export interface StrategicMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  phaseOrder: number;
  coreGoal?: string;
  deliverable?: string;
  participants: string[];
  outputs: string[];
  milestoneDate?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicGoal {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  progress: number;
  quarter?: string;
  attachmentUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalMetric {
  id: string;
  goalId: string;
  label: string;
  value?: number;
  target?: number;
  unit?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectEvent {
  id: string;
  projectId: string;
  type: 'meeting' | 'deliverable' | 'milestone';
  title: string;
  description?: string;
  eventDate: string;
  details?: string;
  participants?: number;
  eventFileUrl?: string;
  eventLink?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  category: 'assessment' | 'strategy' | 'tools';
  title: string;
  description?: string;
  docDate?: string;
  meta?: string;
  fileType?: 'pdf' | 'ppt' | 'xlsx' | 'doc';
  fileUrl?: string;
  documentLink?: string;
  fileSize?: number;
  passwordProtected: boolean;
  password?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMeeting {
  id: string;
  projectId: string;
  title: string;
  meetingDate: string;
  duration?: string;
  participantsCount?: number;
  keyPoints: string[];
  attendees?: string[];
  decisions?: string[];
  actionItems?: string[];
  notes?: string;
  attachmentUrl?: string;
  meetingLink?: string;
  passwordProtected: boolean;
  password?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRecommendation {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: 'internal' | 'external';
  internalType?: 'article' | 'report' | 'book' | 'methodology';
  internalId?: string;
  url?: string;
  sourceName?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProject {
  id: string;
  clientName: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'paused';
  description?: string;

  // Branding
  logoUrl?: string; // URL or data: URI

  // Client-specific page content
  mission?: string;
  vision?: string;
  values?: string[];

  // Annual plan (to make "终点任务" explicit on the client portal)
  northStarMetric?: string; // e.g. 北极星指标（完成定义+口径）
  yearlyDeliverables?: string[]; // 3-7 items
  next14Days?: string[]; // 1-5 items
  quarterlyPlan?: {
    q1?: string[];
    q2?: string[];
    q3?: string[];
    q4?: string[];
  };

  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Legacy (Iteration 1) — kept for backward compatibility of exports.
// Iteration 2 makes milestones client-specific directly, so this mapping is unused.
export interface ProjectMilestone {
  id: string;
  projectId: string;
  milestoneId: string;
  status: 'pending' | 'in-progress' | 'completed';
  startDate?: string;
  endDate?: string;
  actualDate?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ================================================
// Storage keys
// ================================================

const STORAGE_KEYS = {
  strategic_milestones: 'yiyu_strategic_milestones',
  strategic_goals: 'yiyu_strategic_goals',
  goal_metrics: 'yiyu_goal_metrics',
  project_events: 'yiyu_project_events',
  project_documents: 'yiyu_project_documents',
  project_meetings: 'yiyu_project_meetings',
  course_recommendations: 'yiyu_course_recommendations',
  client_projects: 'yiyu_client_projects',
  // legacy
  project_milestones: 'yiyu_project_milestones',
};

// ================================================
// Helpers
// ================================================

const getData = <T,>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T[]) : [];
  } catch (error) {
    console.error(`读取数据失败 (${key}):`, error);
    return [];
  }
};

const saveData = <T,>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`保存数据失败 (${key}):`, error);
  }
};

const emitChange = () => {
  try {
    window.dispatchEvent(new Event('yiyu_data_change'));
  } catch {}
};

const nowIso = () => new Date().toISOString();

// ================================================
// Initialization (default demo data)
// ================================================

const initializeDefaultData = () => {
  if (localStorage.getItem('yiyu_initialized') === 'true') return;

  const now = nowIso();

  // 1) Default clients (so the UI is usable out-of-box)
  const blueId = uuidv4();
  const ruralId = uuidv4();

  const defaultClients: ClientProject[] = [
    {
      id: blueId,
      clientName: '蓝信封',
      projectName: '战略陪伴（演示）',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      description: '默认演示客户（可在后台删除/修改）',
      mission: '支持乡村儿童心理健康与成长',
      vision: '让更多乡村儿童获得持续、温暖的心理陪伴',
      values: ['深度陪伴', '系统思维', '价值共创', '长期主义'],
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ruralId,
      clientName: '中国乡村发展基金会',
      projectName: '战略陪伴（演示）',
      startDate: '2024-02-01',
      endDate: '2024-11-30',
      status: 'active',
      description: '默认演示客户（可在后台删除/修改）',
      mission: '促进乡村可持续发展（演示文案）',
      vision: '推动更有韧性的乡村社区（演示文案）',
      values: ['以人为本', '长期主义', '协同共创', '数据驱动'],
      sortOrder: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  saveData(STORAGE_KEYS.client_projects, defaultClients);

  // 2) Milestones (client-specific)
  const makeMilestones = (projectId: string, variant: 'a' | 'b'): StrategicMilestone[] => {
    const datesA = ['2024年1月', '2024年3月', '2024年6月', '2024年9月', '2024年12月'];
    const datesB = ['2024年2月', '2024年4月', '2024年6月', '2024年8月', '2024年11月'];
    const ds = variant === 'a' ? datesA : datesB;
    return [
      {
        id: uuidv4(),
        projectId,
        title: '战略启动',
        description: '明确战略方向和项目范围',
        status: 'completed',
        phaseOrder: 1,
        coreGoal: '明确组织定位与战略方向',
        deliverable: '战略蓝图 1.0、组织画像报告',
        participants: ['CEO', '核心团队', '益语智库顾问'],
        outputs: ['战略蓝图1.0.pdf', '组织画像报告.pdf'],
        milestoneDate: ds[0],
        sortOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        projectId,
        title: '能力诊断',
        description: '全面评估组织现状和能力',
        status: 'completed',
        phaseOrder: 2,
        coreGoal: '全面评估组织能力现状',
        deliverable: '能力诊断报告、优先级矩阵',
        participants: ['HR负责人', '各部门主管'],
        outputs: ['能力诊断报告.pdf', '优先级矩阵.xlsx'],
        milestoneDate: ds[1],
        sortOrder: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        projectId,
        title: '战略共创',
        description: '制定战略规划和实施路径',
        status: 'in-progress',
        phaseOrder: 3,
        coreGoal: '共创年度战略与关键举措',
        deliverable: '年度战略地图、OKR体系',
        participants: ['管理层', '核心员工'],
        outputs: ['年度战略地图.ppt', 'OKR体系文档.pdf'],
        milestoneDate: ds[2],
        sortOrder: 3,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        projectId,
        title: '执行赋能',
        description: '支持战略落地和执行',
        status: 'pending',
        phaseOrder: 4,
        coreGoal: '提供工具与方法论支持',
        deliverable: '执行手册、工具包、培训材料',
        participants: ['执行团队'],
        outputs: ['执行手册.pdf', '工具包.zip'],
        milestoneDate: ds[3],
        sortOrder: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        projectId,
        title: '复盘迭代',
        description: '评估成效并持续优化',
        status: 'pending',
        phaseOrder: 5,
        coreGoal: '评估成果并优化战略',
        deliverable: '年度复盘报告、战略蓝图 2.0',
        participants: ['管理层', '董事会'],
        outputs: ['年度复盘报告.pdf'],
        milestoneDate: ds[4],
        sortOrder: 5,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  };

  const defaultMilestones = [...makeMilestones(blueId, 'a'), ...makeMilestones(ruralId, 'b')];
  saveData(STORAGE_KEYS.strategic_milestones, defaultMilestones);

  // 3) Goals + metrics (client-specific)
  const goals: StrategicGoal[] = [];
  const metrics: GoalMetric[] = [];

  const addGoal = (projectId: string, title: string, desc: string, progress: number, quarter: string, metricDefs: Array<{ label: string; value: number; target: number; unit: string }>) => {
    const gid = uuidv4();
    goals.push({
      id: gid,
      projectId,
      title,
      description: desc,
      progress,
      quarter,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    metricDefs.forEach((m, idx) =>
      metrics.push({
        id: uuidv4(),
        goalId: gid,
        label: m.label,
        value: m.value,
        target: m.target,
        unit: m.unit,
        sortOrder: idx + 1,
        createdAt: now,
        updatedAt: now,
      })
    );
  };

  addGoal(blueId, '提升品牌影响力', '通过内容营销与公共传播，提高行业知名度', 75, '2024 Q2', [
    { label: '媒体曝光', value: 15, target: 20, unit: '次' },
    { label: '社交媒体增长', value: 2300, target: 3000, unit: '人' },
  ]);
  addGoal(blueId, '优化资源筹募能力', '建立多元化筹资渠道，提升财务可持续性', 60, '2024 Q2', [
    { label: '新捐赠人', value: 32, target: 50, unit: '位' },
    { label: '月均筹款额', value: 28, target: 35, unit: '万元' },
  ]);

  addGoal(ruralId, '项目管理数字化', '搭建数据驱动的项目管理与决策体系', 45, '2024 Q2', [
    { label: '系统上线', value: 2, target: 3, unit: '个' },
    { label: '数据覆盖率', value: 45, target: 80, unit: '%' },
  ]);

  saveData(STORAGE_KEYS.strategic_goals, goals);
  saveData(STORAGE_KEYS.goal_metrics, metrics);

  // 4) Events / Documents / Meetings (client-specific)
  const defaultEvents: ProjectEvent[] = [
    {
      id: uuidv4(),
      projectId: blueId,
      type: 'meeting',
      title: 'Q2 战略例会',
      description: '对齐关键目标与资源配置',
      eventDate: '2024-06-15',
      details: '会议重点：目标进度、关键风险、下一步行动',
      participants: 8,
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      projectId: ruralId,
      type: 'deliverable',
      title: '诊断访谈纪要整理完成',
      description: '完成访谈纪要与问题清单归纳',
      eventDate: '2024-06-20',
      participants: 5,
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  saveData(STORAGE_KEYS.project_events, defaultEvents);

  const defaultDocs: ProjectDocument[] = [
    {
      id: uuidv4(),
      projectId: blueId,
      category: 'assessment',
      title: '组织画像报告（演示）',
      description: '组织现状与关键挑战概览',
      docDate: '2024-03-01',
      meta: 'PDF · 2.4MB',
      fileType: 'pdf',
      documentLink: 'https://example.com',
      passwordProtected: false,
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      projectId: ruralId,
      category: 'strategy',
      title: '年度战略地图（演示）',
      docDate: '2024-06-01',
      meta: 'PPT · 6.1MB',
      fileType: 'ppt',
      documentLink: 'https://example.com',
      passwordProtected: true,
      password: '123456',
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  saveData(STORAGE_KEYS.project_documents, defaultDocs);

  const defaultMeetings: ProjectMeeting[] = [
    {
      id: uuidv4(),
      projectId: blueId,
      title: '战略共创工作坊 #1',
      meetingDate: '2024-06-08',
      duration: '2h',
      participantsCount: 12,
      keyPoints: ['战略主轴', '目标拆解', '资源盘点'],
      meetingLink: 'https://example.com',
      passwordProtected: false,
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  saveData(STORAGE_KEYS.project_meetings, defaultMeetings);

  // 5) Course recommendations
  const defaultCourses: CourseRecommendation[] = [
    {
      id: uuidv4(),
      projectId: blueId,
      title: 'OKR 入门与落地（外部）',
      description: '建议用于目标拆解与复盘节奏设计',
      type: 'external',
      url: 'https://example.com',
      sourceName: '示例来源',
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      projectId: ruralId,
      title: '数据驱动管理：关键指标设计（外部）',
      description: '建议用于指标体系搭建与仪表盘规划',
      type: 'external',
      url: 'https://example.com',
      sourceName: '示例来源',
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  saveData(STORAGE_KEYS.course_recommendations, defaultCourses);

  localStorage.setItem('yiyu_initialized', 'true');
  emitChange();
  console.log('✅ 本地数据已初始化 (Iteration 2)');
};

initializeDefaultData();

// ================================================
// CRUD: Milestones (client-specific)
// ================================================

export const getStrategicMilestones = async (projectId?: string): Promise<StrategicMilestone[]> => {
  const all = getData<StrategicMilestone>(STORAGE_KEYS.strategic_milestones);
  const filtered = projectId ? all.filter(m => m.projectId === projectId) : all;
  return filtered
    .filter(m => m.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));
};

export const saveStrategicMilestone = async (milestone: Partial<StrategicMilestone>): Promise<StrategicMilestone | null> => {
  const items = getData<StrategicMilestone>(STORAGE_KEYS.strategic_milestones);
  const now = nowIso();

  if (milestone.id) {
    const index = items.findIndex(m => m.id === milestone.id);
    if (index === -1) return null;
    const updated: StrategicMilestone = { ...items[index], ...milestone, updatedAt: now } as StrategicMilestone;
    items[index] = updated;
    saveData(STORAGE_KEYS.strategic_milestones, items);
    emitChange();
    return updated;
  }

  if (!milestone.projectId) {
    console.error('saveStrategicMilestone: missing projectId');
    return null;
  }

  const created: StrategicMilestone = {
    id: uuidv4(),
    projectId: milestone.projectId,
    title: milestone.title || '新里程碑',
    description: milestone.description,
    status: milestone.status || 'pending',
    phaseOrder: milestone.phaseOrder || 1,
    coreGoal: milestone.coreGoal,
    deliverable: milestone.deliverable,
    participants: milestone.participants || [],
    outputs: milestone.outputs || [],
    milestoneDate: milestone.milestoneDate,
    sortOrder: milestone.sortOrder ?? 0,
    isActive: milestone.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.strategic_milestones, items);
  emitChange();
  return created;
};

export const deleteStrategicMilestone = async (id: string): Promise<boolean> => {
  const items = getData<StrategicMilestone>(STORAGE_KEYS.strategic_milestones);
  const filtered = items.filter(m => m.id !== id);
  if (filtered.length === items.length) return false;
  saveData(STORAGE_KEYS.strategic_milestones, filtered);
  emitChange();
  return true;
};

// ================================================
// CRUD: Goals (client-specific)
// ================================================

export const getStrategicGoals = async (projectId?: string): Promise<StrategicGoal[]> => {
  const all = getData<StrategicGoal>(STORAGE_KEYS.strategic_goals);
  const filtered = projectId ? all.filter(g => g.projectId === projectId) : all;
  return filtered
    .filter(g => g.isActive !== false)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
};

export const saveStrategicGoal = async (goal: Partial<StrategicGoal>): Promise<StrategicGoal | null> => {
  const items = getData<StrategicGoal>(STORAGE_KEYS.strategic_goals);
  const now = nowIso();

  if (goal.id) {
    const index = items.findIndex(g => g.id === goal.id);
    if (index === -1) return null;
    const updated: StrategicGoal = { ...items[index], ...goal, updatedAt: now } as StrategicGoal;
    items[index] = updated;
    saveData(STORAGE_KEYS.strategic_goals, items);
    emitChange();
    return updated;
  }

  if (!goal.projectId) {
    console.error('saveStrategicGoal: missing projectId');
    return null;
  }

  const created: StrategicGoal = {
    id: uuidv4(),
    projectId: goal.projectId,
    title: goal.title || '新目标',
    description: goal.description,
    progress: goal.progress ?? 0,
    quarter: goal.quarter,
    attachmentUrl: goal.attachmentUrl,
    isActive: goal.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.strategic_goals, items);
  emitChange();
  return created;
};

export const deleteStrategicGoal = async (id: string): Promise<boolean> => {
  const items = getData<StrategicGoal>(STORAGE_KEYS.strategic_goals);
  const filtered = items.filter(g => g.id !== id);
  if (filtered.length === items.length) return false;
  saveData(STORAGE_KEYS.strategic_goals, filtered);

  // cascade delete metrics
  const metrics = getData<GoalMetric>(STORAGE_KEYS.goal_metrics);
  saveData(STORAGE_KEYS.goal_metrics, metrics.filter(m => m.goalId !== id));

  emitChange();
  return true;
};

// ================================================
// CRUD: Goal metrics
// ================================================

export const getGoalMetrics = async (goalId: string): Promise<GoalMetric[]> => {
  const items = getData<GoalMetric>(STORAGE_KEYS.goal_metrics);
  return items
    .filter(m => m.goalId === goalId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
};

export const saveGoalMetric = async (metric: Partial<GoalMetric>): Promise<GoalMetric | null> => {
  const items = getData<GoalMetric>(STORAGE_KEYS.goal_metrics);
  const now = nowIso();

  if (metric.id) {
    const index = items.findIndex(m => m.id === metric.id);
    if (index === -1) return null;
    const updated: GoalMetric = { ...items[index], ...metric, updatedAt: now } as GoalMetric;
    items[index] = updated;
    saveData(STORAGE_KEYS.goal_metrics, items);
    emitChange();
    return updated;
  }

  if (!metric.goalId) {
    console.error('saveGoalMetric: missing goalId');
    return null;
  }

  const created: GoalMetric = {
    id: uuidv4(),
    goalId: metric.goalId,
    label: metric.label || '新指标',
    value: metric.value,
    target: metric.target,
    unit: metric.unit,
    sortOrder: metric.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.goal_metrics, items);
  emitChange();
  return created;
};

export const deleteGoalMetric = async (id: string): Promise<boolean> => {
  const items = getData<GoalMetric>(STORAGE_KEYS.goal_metrics);
  const filtered = items.filter(m => m.id !== id);
  if (filtered.length === items.length) return false;
  saveData(STORAGE_KEYS.goal_metrics, filtered);
  emitChange();
  return true;
};

// ================================================
// CRUD: Events / Documents / Meetings (client-specific)
// ================================================

export const getProjectEvents = async (projectId?: string): Promise<ProjectEvent[]> => {
  const all = getData<ProjectEvent>(STORAGE_KEYS.project_events);
  const filtered = projectId ? all.filter(e => e.projectId === projectId) : all;
  return filtered
    .filter(e => e.isActive !== false)
    .sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || '') || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
};

export const saveProjectEvent = async (event: Partial<ProjectEvent>): Promise<ProjectEvent | null> => {
  const items = getData<ProjectEvent>(STORAGE_KEYS.project_events);
  const now = nowIso();

  if (event.id) {
    const index = items.findIndex(e => e.id === event.id);
    if (index === -1) return null;
    const updated: ProjectEvent = { ...items[index], ...event, updatedAt: now } as ProjectEvent;
    items[index] = updated;
    saveData(STORAGE_KEYS.project_events, items);
    emitChange();
    return updated;
  }

  if (!event.projectId) {
    console.error('saveProjectEvent: missing projectId');
    return null;
  }

  const created: ProjectEvent = {
    id: uuidv4(),
    projectId: event.projectId,
    type: event.type || 'meeting',
    title: event.title || '新事件',
    description: event.description,
    eventDate: event.eventDate || new Date().toISOString().slice(0, 10),
    details: event.details,
    participants: event.participants,
    eventFileUrl: event.eventFileUrl,
    eventLink: event.eventLink,
    sortOrder: event.sortOrder ?? 0,
    isActive: event.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.project_events, items);
  emitChange();
  return created;
};

export const deleteProjectEvent = async (id: string): Promise<boolean> => {
  const items = getData<ProjectEvent>(STORAGE_KEYS.project_events);
  const filtered = items.filter(e => e.id !== id);
  if (filtered.length === items.length) return false;
  saveData(STORAGE_KEYS.project_events, filtered);
  emitChange();
  return true;
};

export const getProjectDocuments = async (projectId?: string): Promise<ProjectDocument[]> => {
  const all = getData<ProjectDocument>(STORAGE_KEYS.project_documents);
  const filtered = projectId ? all.filter(d => d.projectId === projectId) : all;
  return filtered
    .filter(d => d.isActive !== false)
    .sort((a, b) => (b.docDate || '').localeCompare(a.docDate || '') || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
};

export const saveProjectDocument = async (doc: Partial<ProjectDocument>): Promise<ProjectDocument | null> => {
  const items = getData<ProjectDocument>(STORAGE_KEYS.project_documents);
  const now = nowIso();

  if (doc.id) {
    const index = items.findIndex(d => d.id === doc.id);
    if (index === -1) return null;
    const updated: ProjectDocument = { ...items[index], ...doc, updatedAt: now } as ProjectDocument;
    items[index] = updated;
    saveData(STORAGE_KEYS.project_documents, items);
    emitChange();
    return updated;
  }

  if (!doc.projectId) {
    console.error('saveProjectDocument: missing projectId');
    return null;
  }

  const created: ProjectDocument = {
    id: uuidv4(),
    projectId: doc.projectId,
    category: doc.category || 'strategy',
    title: doc.title || '新文档',
    description: doc.description,
    docDate: doc.docDate,
    meta: doc.meta,
    fileType: doc.fileType,
    fileUrl: doc.fileUrl,
    documentLink: doc.documentLink,
    fileSize: doc.fileSize,
    passwordProtected: doc.passwordProtected ?? false,
    password: doc.password,
    sortOrder: doc.sortOrder ?? 0,
    isActive: doc.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.project_documents, items);
  emitChange();
  return created;
};

export const deleteProjectDocument = async (id: string): Promise<boolean> => {
  const items = getData<ProjectDocument>(STORAGE_KEYS.project_documents);
  const filtered = items.filter(d => d.id !== id);
  if (filtered.length === items.length) return false;
  saveData(STORAGE_KEYS.project_documents, filtered);
  emitChange();
  return true;
};

export const getProjectMeetings = async (projectId?: string): Promise<ProjectMeeting[]> => {
  const all = getData<ProjectMeeting>(STORAGE_KEYS.project_meetings);
  const filtered = projectId ? all.filter(m => m.projectId === projectId) : all;
  return filtered
    .filter(m => m.isActive !== false)
    .sort((a, b) => (b.meetingDate || '').localeCompare(a.meetingDate || '') || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
};

export const saveProjectMeeting = async (meeting: Partial<ProjectMeeting>): Promise<ProjectMeeting | null> => {
  const items = getData<ProjectMeeting>(STORAGE_KEYS.project_meetings);
  const now = nowIso();

  if (meeting.id) {
    const index = items.findIndex(m => m.id === meeting.id);
    if (index === -1) return null;
    const updated: ProjectMeeting = { ...items[index], ...meeting, updatedAt: now } as ProjectMeeting;
    items[index] = updated;
    saveData(STORAGE_KEYS.project_meetings, items);
    emitChange();
    return updated;
  }

  if (!meeting.projectId) {
    console.error('saveProjectMeeting: missing projectId');
    return null;
  }

  const created: ProjectMeeting = {
    id: uuidv4(),
    projectId: meeting.projectId,
    title: meeting.title || '新会议',
    meetingDate: meeting.meetingDate || new Date().toISOString().slice(0, 10),
    duration: meeting.duration,
    participantsCount: meeting.participantsCount,
    keyPoints: meeting.keyPoints || [],
    attendees: meeting.attendees,
    decisions: meeting.decisions,
    actionItems: meeting.actionItems,
    notes: meeting.notes,
    attachmentUrl: meeting.attachmentUrl,
    meetingLink: meeting.meetingLink,
    passwordProtected: meeting.passwordProtected ?? false,
    password: meeting.password,
    sortOrder: meeting.sortOrder ?? 0,
    isActive: meeting.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.project_meetings, items);
  emitChange();
  return created;
};

export const deleteProjectMeeting = async (id: string): Promise<boolean> => {
  const items = getData<ProjectMeeting>(STORAGE_KEYS.project_meetings);
  const filtered = items.filter(m => m.id !== id);
  if (filtered.length === items.length) return false;
  saveData(STORAGE_KEYS.project_meetings, filtered);
  emitChange();
  return true;
};

// ================================================
// CRUD: Course recommendations (client-specific)
// ================================================

export const getCourseRecommendations = async (projectId?: string): Promise<CourseRecommendation[]> => {
  const all = getData<CourseRecommendation>(STORAGE_KEYS.course_recommendations);
  const filtered = projectId ? all.filter(r => r.projectId === projectId) : all;
  return filtered
    .filter(r => r.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
};

export const saveCourseRecommendation = async (rec: Partial<CourseRecommendation>): Promise<CourseRecommendation | null> => {
  const items = getData<CourseRecommendation>(STORAGE_KEYS.course_recommendations);
  const now = nowIso();

  if (rec.id) {
    const index = items.findIndex(r => r.id === rec.id);
    if (index === -1) return null;
    const updated: CourseRecommendation = { ...items[index], ...rec, updatedAt: now } as CourseRecommendation;
    items[index] = updated;
    saveData(STORAGE_KEYS.course_recommendations, items);
    emitChange();
    return updated;
  }

  if (!rec.projectId) {
    console.error('saveCourseRecommendation: missing projectId');
    return null;
  }

  const created: CourseRecommendation = {
    id: uuidv4(),
    projectId: rec.projectId,
    title: rec.title || '新推荐',
    description: rec.description,
    type: rec.type || 'external',
    internalType: rec.internalType,
    internalId: rec.internalId,
    url: rec.url,
    sourceName: rec.sourceName,
    sortOrder: rec.sortOrder ?? 0,
    isActive: rec.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.course_recommendations, items);
  emitChange();
  return created;
};

export const deleteCourseRecommendation = async (id: string): Promise<boolean> => {
  const items = getData<CourseRecommendation>(STORAGE_KEYS.course_recommendations);
  const filtered = items.filter(r => r.id !== id);
  if (filtered.length === items.length) return false;
  saveData(STORAGE_KEYS.course_recommendations, filtered);
  emitChange();
  return true;
};

// ================================================
// CRUD: Client projects
// ================================================

export const getClientProjects = async (): Promise<ClientProject[]> => {
  const items = getData<ClientProject>(STORAGE_KEYS.client_projects);

  // Migration/ensure: add “为爱黔行” demo client + downloadable interview docs when missing.
  // This runs even if localStorage was already initialized, so users don’t have to clear cache.
  const hasWeiai = items.some(p => (p.clientName || '').trim() === '为爱黔行');
  if (!hasWeiai) {
    const now = nowIso();
    const weiaiId = uuidv4();

    items.push({
      id: weiaiId,
      clientName: '为爱黔行',
      projectName: '战略陪伴（演示）',
      startDate: '2026-02-01',
      endDate: '2026-12-31',
      status: 'active',
      description: '新建客户（可在后台继续补全 Mission/Vision/Values 与里程碑）',
      mission: '',
      vision: '',
      values: [],
      sortOrder: (Math.max(0, ...items.map(x => x.sortOrder ?? 0)) + 1) || 3,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    saveData(STORAGE_KEYS.client_projects, items);

    // Seed “整理稿”下载文档（可在后台再编辑分类/描述）
    const docs = getData<ProjectDocument>(STORAGE_KEYS.project_documents);
    const base = '/yiyu-think-tank-website/docs/weiaiqianxing';
    const seed = [
      { title: '项目三姐妹（访谈整理稿）', file: '为爱黔行_项目三姐妹（整理稿）.docx' },
      { title: '吴老师（创始人）第一次访谈（整理稿）', file: '为爱黔行_吴老师_创始人_第一次访谈（整理稿）.docx' },
      { title: '陶老师专访（整理稿）', file: '为爱黔行_陶老师专访（整理稿）.docx' },
    ];

    seed.forEach((s, idx) => {
      docs.push({
        id: uuidv4(),
        projectId: weiaiId,
        category: 'assessment',
        title: s.title,
        description: '访谈文字整理稿（可下载）',
        docDate: '2026-02-06',
        meta: 'DOCX',
        fileType: 'doc',
        fileUrl: `${base}/${encodeURIComponent(s.file)}`,
        passwordProtected: false,
        sortOrder: idx + 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    });

    saveData(STORAGE_KEYS.project_documents, docs);
    emitChange();
  }

  return items
    .filter(p => p.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
};

export const saveClientProject = async (project: Partial<ClientProject>): Promise<ClientProject | null> => {
  const items = getData<ClientProject>(STORAGE_KEYS.client_projects);
  const now = nowIso();

  if (project.id) {
    const index = items.findIndex(p => p.id === project.id);
    if (index === -1) return null;
    const updated: ClientProject = { ...items[index], ...project, updatedAt: now } as ClientProject;
    items[index] = updated;
    saveData(STORAGE_KEYS.client_projects, items);
    emitChange();
    return updated;
  }

  const created: ClientProject = {
    id: uuidv4(),
    clientName: project.clientName || '新客户',
    projectName: project.projectName,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status || 'active',
    description: project.description,
    logoUrl: project.logoUrl,
    mission: project.mission,
    vision: project.vision,
    values: project.values || [],
    sortOrder: project.sortOrder ?? 0,
    isActive: project.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.client_projects, items);
  emitChange();
  return created;
};

export const deleteClientProject = async (id: string): Promise<boolean> => {
  const items = getData<ClientProject>(STORAGE_KEYS.client_projects);
  const filtered = items.filter(p => p.id !== id);
  if (filtered.length === items.length) return false;
  saveData(STORAGE_KEYS.client_projects, filtered);

  // optional cascade cleanup (safe best-effort)
  saveData(STORAGE_KEYS.strategic_milestones, getData<StrategicMilestone>(STORAGE_KEYS.strategic_milestones).filter(m => m.projectId !== id));
  const goals = getData<StrategicGoal>(STORAGE_KEYS.strategic_goals);
  const removedGoalIds = goals.filter(g => g.projectId === id).map(g => g.id);
  saveData(STORAGE_KEYS.strategic_goals, goals.filter(g => g.projectId !== id));
  saveData(STORAGE_KEYS.goal_metrics, getData<GoalMetric>(STORAGE_KEYS.goal_metrics).filter(m => !removedGoalIds.includes(m.goalId)));
  saveData(STORAGE_KEYS.project_events, getData<ProjectEvent>(STORAGE_KEYS.project_events).filter(e => e.projectId !== id));
  saveData(STORAGE_KEYS.project_documents, getData<ProjectDocument>(STORAGE_KEYS.project_documents).filter(d => d.projectId !== id));
  saveData(STORAGE_KEYS.project_meetings, getData<ProjectMeeting>(STORAGE_KEYS.project_meetings).filter(m => m.projectId !== id));
  saveData(STORAGE_KEYS.course_recommendations, getData<CourseRecommendation>(STORAGE_KEYS.course_recommendations).filter(r => r.projectId !== id));

  emitChange();
  return true;
};

// ================================================
// Legacy: ProjectMilestones mapping (unused)
// ================================================

export const getProjectMilestones = async (projectId: string): Promise<ProjectMilestone[]> => {
  const all = getData<ProjectMilestone>(STORAGE_KEYS.project_milestones);
  return all.filter(pm => pm.projectId === projectId);
};

export const saveProjectMilestone = async (pm: Partial<ProjectMilestone>): Promise<ProjectMilestone | null> => {
  const items = getData<ProjectMilestone>(STORAGE_KEYS.project_milestones);
  const now = nowIso();

  if (pm.id) {
    const index = items.findIndex(x => x.id === pm.id);
    if (index === -1) return null;
    const updated: ProjectMilestone = { ...items[index], ...pm, updatedAt: now } as ProjectMilestone;
    items[index] = updated;
    saveData(STORAGE_KEYS.project_milestones, items);
    emitChange();
    return updated;
  }

  if (!pm.projectId || !pm.milestoneId) return null;

  const created: ProjectMilestone = {
    id: uuidv4(),
    projectId: pm.projectId,
    milestoneId: pm.milestoneId,
    status: pm.status || 'pending',
    startDate: pm.startDate,
    endDate: pm.endDate,
    actualDate: pm.actualDate,
    notes: pm.notes,
    sortOrder: pm.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  items.push(created);
  saveData(STORAGE_KEYS.project_milestones, items);
  emitChange();
  return created;
};

// ================================================
// Aggregation helpers
// ================================================

export const getStrategyCompanionData = async (projectId?: string) => {
  const [milestones, goals, events, documents, meetings, courses] = await Promise.all([
    getStrategicMilestones(projectId),
    getStrategicGoals(projectId),
    getProjectEvents(projectId),
    getProjectDocuments(projectId),
    getProjectMeetings(projectId),
    getCourseRecommendations(projectId),
  ]);

  const goalsWithMetrics = await Promise.all(
    goals.map(async (goal) => ({ ...goal, metrics: await getGoalMetrics(goal.id) }))
  );

  return { milestones, goals: goalsWithMetrics, events, documents, meetings, courseRecommendations: courses };
};

// ================================================
// Utilities
// ================================================

export const clearAllLocalData = () => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem('yiyu_initialized');
  emitChange();
  console.log('🗑️ 所有本地数据已清除');
};

export const exportLocalData = () => {
  const data: Record<string, unknown> = {};
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    data[name] = getData(key);
  });
  return JSON.stringify(data, null, 2);
};

console.log('✅ 本地数据服务已加载 (Iteration 2)');
console.log('💡 使用 localStorage 进行数据存储');
