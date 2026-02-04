/**
 * 本地数据服务层
 * 使用 localStorage 进行数据存储，用于本地开发和测试
 * 
 * 使用方法：
 * 1. 在开发时导入此文件
 * 2. 所有数据将保存在浏览器 localStorage 中
 * 3. 测试通过后，切换回 dataServiceSupabase.ts 即可连接线上数据库
 */

import { v4 as uuidv4 } from 'uuid';

// 数据类型定义（与 dataServiceSupabase.ts 保持一致）
export interface StrategicMilestone {
  id: string;
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
  title: string;
  description?: string;
  progress: number;
  quarter?: string;
  attachmentUrl?: string;        // 附件URL（方法论文档、PDF等）
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
  category: 'assessment' | 'strategy' | 'tools';
  title: string;
  description?: string;
  docDate?: string;
  meta?: string;
  fileType?: 'pdf' | 'ppt' | 'xlsx' | 'doc';
  fileUrl?: string;              // 上传的文件URL
  documentLink?: string;         // 外部文档链接
  fileSize?: number;
  passwordProtected: boolean;    // 是否启用密码保护
  password?: string;             // 下载密码（可选）
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMeeting {
  id: string;
  title: string;
  meetingDate: string;
  duration?: string;
  participantsCount?: number;
  keyPoints: string[];
  attendees?: string[];
  decisions?: string[];
  actionItems?: string[];
  notes?: string;
  attachmentUrl?: string;        // 会议记录附件URL
  meetingLink?: string;          // 会议链接（如腾讯会议、Zoom等）
  passwordProtected: boolean;    // 是否启用密码保护
  password?: string;             // 下载密码（可选）
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
  currentMilestoneId?: string;
  currentGoalId?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

// LocalStorage 键名
const STORAGE_KEYS = {
  strategic_milestones: 'yiyu_strategic_milestones',
  strategic_goals: 'yiyu_strategic_goals',
  goal_metrics: 'yiyu_goal_metrics',
  project_events: 'yiyu_project_events',
  project_documents: 'yiyu_project_documents',
  project_meetings: 'yiyu_project_meetings',
  client_projects: 'yiyu_client_projects',
  project_milestones: 'yiyu_project_milestones',
};

// 初始化默认数据
const initializeDefaultData = () => {
  // 检查是否已经初始化过
  if (localStorage.getItem('yiyu_initialized') === 'true') {
    return;
  }

  // 初始化战略里程碑
  const defaultMilestones: StrategicMilestone[] = [
    {
      id: uuidv4(),
      title: '战略启动',
      description: '明确战略方向和项目范围',
      status: 'pending',
      phaseOrder: 1,
      coreGoal: '明确战略方向和项目范围',
      deliverable: '战略启动报告',
      participants: [],
      outputs: [],
      sortOrder: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: '能力诊断',
      description: '全面评估组织现状和能力',
      status: 'pending',
      phaseOrder: 2,
      coreGoal: '全面评估组织现状和能力',
      deliverable: '能力诊断报告',
      participants: [],
      outputs: [],
      sortOrder: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: '战略共创',
      description: '制定战略规划和实施路径',
      status: 'pending',
      phaseOrder: 3,
      coreGoal: '制定战略规划和实施路径',
      deliverable: '战略规划书',
      participants: [],
      outputs: [],
      sortOrder: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: '执行赋能',
      description: '支持战略落地和执行',
      status: 'pending',
      phaseOrder: 4,
      coreGoal: '支持战略落地和执行',
      deliverable: '执行手册和培训材料',
      participants: [],
      outputs: [],
      sortOrder: 4,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: '复盘迭代',
      description: '评估成效并持续优化',
      status: 'pending',
      phaseOrder: 5,
      coreGoal: '评估成效并持续优化',
      deliverable: '复盘报告和优化方案',
      participants: [],
      outputs: [],
      sortOrder: 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem(STORAGE_KEYS.strategic_milestones, JSON.stringify(defaultMilestones));
  
  // 初始化本季度重点目标
  const goal1Id = uuidv4();
  const goal2Id = uuidv4();
  const goal3Id = uuidv4();
  
  const defaultGoals: StrategicGoal[] = [
    {
      id: goal1Id,
      title: '提升品牌影响力',
      description: '通过内容营销和公共传播，提高行业知名度',
      progress: 75,
      quarter: '2024 Q2',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: goal2Id,
      title: '优化资源筹募能力',
      description: '建立多元化筹资渠道，确保财务可持续',
      progress: 60,
      quarter: '2024 Q2',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: goal3Id,
      title: '强化数字化运营',
      description: '搭建数据驱动的项目管理与决策体系',
      progress: 45,
      quarter: '2024 Q2',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  
  const defaultGoalMetrics: GoalMetric[] = [
    // 目标1的指标
    {
      id: uuidv4(),
      goalId: goal1Id,
      label: '媒体曝光',
      value: 15,
      target: 20,
      unit: '次',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      goalId: goal1Id,
      label: '社交媒体增长',
      value: 2300,
      target: 3000,
      unit: '人',
      sortOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 目标2的指标
    {
      id: uuidv4(),
      goalId: goal2Id,
      label: '新捐赠人',
      value: 32,
      target: 50,
      unit: '位',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      goalId: goal2Id,
      label: '月均筹款额',
      value: 28,
      target: 35,
      unit: '万元',
      sortOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 目标3的指标
    {
      id: uuidv4(),
      goalId: goal3Id,
      label: '系统上线',
      value: 2,
      target: 3,
      unit: '个',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      goalId: goal3Id,
      label: '数据覆盖率',
      value: 45,
      target: 80,
      unit: '%',
      sortOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  
  localStorage.setItem(STORAGE_KEYS.strategic_goals, JSON.stringify(defaultGoals));
  localStorage.setItem(STORAGE_KEYS.goal_metrics, JSON.stringify(defaultGoalMetrics));
  
  // 标记已初始化
  localStorage.setItem('yiyu_initialized', 'true');
  
  console.log('✅ 本地数据已初始化');
};

// 初始化
initializeDefaultData();

// 通用 CRUD 操作
const getData = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`读取数据失败 (${key}):`, error);
    return [];
  }
};

const saveData = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`保存数据失败 (${key}):`, error);
  }
};

// 战略里程碑管理
export const getStrategicMilestones = async (): Promise<StrategicMilestone[]> => {
  return getData<StrategicMilestone>(STORAGE_KEYS.strategic_milestones);
};

export const saveStrategicMilestone = async (
  milestone: Partial<StrategicMilestone>
): Promise<StrategicMilestone | null> => {
  const milestones = getData<StrategicMilestone>(STORAGE_KEYS.strategic_milestones);
  
  const now = new Date().toISOString();
  
  if (milestone.id) {
    // 更新现有记录
    const index = milestones.findIndex(m => m.id === milestone.id);
    if (index === -1) {
      console.error('里程碑不存在:', milestone.id);
      return null;
    }
    
    const updated: StrategicMilestone = {
      ...milestones[index],
      ...milestone,
      updatedAt: now,
    } as StrategicMilestone;
    
    milestones[index] = updated;
    saveData(STORAGE_KEYS.strategic_milestones, milestones);
    return updated;
  } else {
    // 创建新记录
    const newMilestone: StrategicMilestone = {
      id: uuidv4(),
      title: milestone.title || '新里程碑',
      description: milestone.description,
      status: milestone.status || 'pending',
      phaseOrder: milestone.phaseOrder || milestones.length + 1,
      coreGoal: milestone.coreGoal,
      deliverable: milestone.deliverable,
      participants: milestone.participants || [],
      outputs: milestone.outputs || [],
      milestoneDate: milestone.milestoneDate,
      sortOrder: milestone.sortOrder || 0,
      isActive: milestone.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    
    milestones.push(newMilestone);
    saveData(STORAGE_KEYS.strategic_milestones, milestones);
    return newMilestone;
  }
};

export const deleteStrategicMilestone = async (id: string): Promise<boolean> => {
  const milestones = getData<StrategicMilestone>(STORAGE_KEYS.strategic_milestones);
  const filtered = milestones.filter(m => m.id !== id);
  
  if (filtered.length === milestones.length) {
    console.warn('里程碑不存在:', id);
    return false;
  }
  
  saveData(STORAGE_KEYS.strategic_milestones, filtered);
  return true;
};

// 战略目标管理
export const getStrategicGoals = async (): Promise<StrategicGoal[]> => {
  return getData<StrategicGoal>(STORAGE_KEYS.strategic_goals);
};

export const saveStrategicGoal = async (
  goal: Partial<StrategicGoal>
): Promise<StrategicGoal | null> => {
  const goals = getData<StrategicGoal>(STORAGE_KEYS.strategic_goals);
  const now = new Date().toISOString();
  
  if (goal.id) {
    const index = goals.findIndex(g => g.id === goal.id);
    if (index === -1) {
      console.error('目标不存在:', goal.id);
      return null;
    }
    
    const updated: StrategicGoal = {
      ...goals[index],
      ...goal,
      updatedAt: now,
    } as StrategicGoal;
    
    goals[index] = updated;
    saveData(STORAGE_KEYS.strategic_goals, goals);
    return updated;
  } else {
    const newGoal: StrategicGoal = {
      id: uuidv4(),
      title: goal.title || '新目标',
      description: goal.description,
      progress: goal.progress || 0,
      quarter: goal.quarter,
      isActive: goal.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    
    goals.push(newGoal);
    saveData(STORAGE_KEYS.strategic_goals, goals);
    return newGoal;
  }
};

export const deleteStrategicGoal = async (id: string): Promise<boolean> => {
  const goals = getData<StrategicGoal>(STORAGE_KEYS.strategic_goals);
  const filtered = goals.filter(g => g.id !== id);
  
  // 同时删除关联的指标
  const metrics = getData<GoalMetric>(STORAGE_KEYS.goal_metrics);
  const filteredMetrics = metrics.filter(m => m.goalId !== id);
  saveData(STORAGE_KEYS.goal_metrics, filteredMetrics);
  
  if (filtered.length === goals.length) {
    return false;
  }
  
  saveData(STORAGE_KEYS.strategic_goals, filtered);
  return true;
};

// 目标指标管理
export const getGoalMetrics = async (goalId: string): Promise<GoalMetric[]> => {
  const metrics = getData<GoalMetric>(STORAGE_KEYS.goal_metrics);
  return metrics.filter(m => m.goalId === goalId);
};

export const saveGoalMetric = async (
  metric: Partial<GoalMetric>
): Promise<GoalMetric | null> => {
  const metrics = getData<GoalMetric>(STORAGE_KEYS.goal_metrics);
  const now = new Date().toISOString();
  
  if (metric.id) {
    const index = metrics.findIndex(m => m.id === metric.id);
    if (index === -1) {
      console.error('指标不存在:', metric.id);
      return null;
    }
    
    const updated: GoalMetric = {
      ...metrics[index],
      ...metric,
      updatedAt: now,
    } as GoalMetric;
    
    metrics[index] = updated;
    saveData(STORAGE_KEYS.goal_metrics, metrics);
    return updated;
  } else {
    const newMetric: GoalMetric = {
      id: uuidv4(),
      goalId: metric.goalId || '',
      label: metric.label || '新指标',
      value: metric.value,
      target: metric.target,
      unit: metric.unit,
      sortOrder: metric.sortOrder || 0,
      createdAt: now,
      updatedAt: now,
    };
    
    metrics.push(newMetric);
    saveData(STORAGE_KEYS.goal_metrics, metrics);
    return newMetric;
  }
};

export const deleteGoalMetric = async (id: string): Promise<boolean> => {
  const metrics = getData<GoalMetric>(STORAGE_KEYS.goal_metrics);
  const filtered = metrics.filter(m => m.id !== id);
  
  if (filtered.length === metrics.length) {
    return false;
  }
  
  saveData(STORAGE_KEYS.goal_metrics, filtered);
  return true;
};

// 项目事件管理
export const getProjectEvents = async (): Promise<ProjectEvent[]> => {
  return getData<ProjectEvent>(STORAGE_KEYS.project_events);
};

export const saveProjectEvent = async (
  event: Partial<ProjectEvent>
): Promise<ProjectEvent | null> => {
  const events = getData<ProjectEvent>(STORAGE_KEYS.project_events);
  const now = new Date().toISOString();
  
  if (event.id) {
    const index = events.findIndex(e => e.id === event.id);
    if (index === -1) {
      console.error('事件不存在:', event.id);
      return null;
    }
    
    const updated: ProjectEvent = {
      ...events[index],
      ...event,
      updatedAt: now,
    } as ProjectEvent;
    
    events[index] = updated;
    saveData(STORAGE_KEYS.project_events, events);
    return updated;
  } else {
    const newEvent: ProjectEvent = {
      id: uuidv4(),
      type: event.type || 'meeting',
      title: event.title || '新事件',
      description: event.description,
      eventDate: event.eventDate || new Date().toISOString().split('T')[0],
      details: event.details,
      participants: event.participants,
      sortOrder: event.sortOrder || 0,
      isActive: event.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    
    events.push(newEvent);
    saveData(STORAGE_KEYS.project_events, events);
    return newEvent;
  }
};

export const deleteProjectEvent = async (id: string): Promise<boolean> => {
  const events = getData<ProjectEvent>(STORAGE_KEYS.project_events);
  const filtered = events.filter(e => e.id !== id);
  
  if (filtered.length === events.length) {
    return false;
  }
  
  saveData(STORAGE_KEYS.project_events, filtered);
  return true;
};

// 项目文档管理
export const getProjectDocuments = async (): Promise<ProjectDocument[]> => {
  return getData<ProjectDocument>(STORAGE_KEYS.project_documents);
};

export const saveProjectDocument = async (
  document: Partial<ProjectDocument>
): Promise<ProjectDocument | null> => {
  const documents = getData<ProjectDocument>(STORAGE_KEYS.project_documents);
  const now = new Date().toISOString();
  
  if (document.id) {
    const index = documents.findIndex(d => d.id === document.id);
    if (index === -1) {
      console.error('文档不存在:', document.id);
      return null;
    }
    
    const updated: ProjectDocument = {
      ...documents[index],
      ...document,
      updatedAt: now,
    } as ProjectDocument;
    
    documents[index] = updated;
    saveData(STORAGE_KEYS.project_documents, documents);
    return updated;
  } else {
    const newDocument: ProjectDocument = {
      id: uuidv4(),
      category: document.category || 'assessment',
      title: document.title || '新文档',
      description: document.description,
      docDate: document.docDate,
      meta: document.meta,
      fileType: document.fileType,
      fileUrl: document.fileUrl,
      fileSize: document.fileSize,
      passwordProtected: document.passwordProtected || false,
      password: document.password,
      sortOrder: document.sortOrder || 0,
      isActive: document.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    
    documents.push(newDocument);
    saveData(STORAGE_KEYS.project_documents, documents);
    return newDocument;
  }
};

export const deleteProjectDocument = async (id: string): Promise<boolean> => {
  const documents = getData<ProjectDocument>(STORAGE_KEYS.project_documents);
  const filtered = documents.filter(d => d.id !== id);
  
  if (filtered.length === documents.length) {
    return false;
  }
  
  saveData(STORAGE_KEYS.project_documents, filtered);
  return true;
};

// 项目会议管理
export const getProjectMeetings = async (): Promise<ProjectMeeting[]> => {
  return getData<ProjectMeeting>(STORAGE_KEYS.project_meetings);
};

export const saveProjectMeeting = async (
  meeting: Partial<ProjectMeeting>
): Promise<ProjectMeeting | null> => {
  const meetings = getData<ProjectMeeting>(STORAGE_KEYS.project_meetings);
  const now = new Date().toISOString();
  
  if (meeting.id) {
    const index = meetings.findIndex(m => m.id === meeting.id);
    if (index === -1) {
      console.error('会议不存在:', meeting.id);
      return null;
    }
    
    const updated: ProjectMeeting = {
      ...meetings[index],
      ...meeting,
      updatedAt: now,
    } as ProjectMeeting;
    
    meetings[index] = updated;
    saveData(STORAGE_KEYS.project_meetings, meetings);
    return updated;
  } else {
    const newMeeting: ProjectMeeting = {
      id: uuidv4(),
      title: meeting.title || '新会议',
      meetingDate: meeting.meetingDate || now,
      duration: meeting.duration,
      participantsCount: meeting.participantsCount,
      keyPoints: meeting.keyPoints || [],
      attendees: meeting.attendees,
      decisions: meeting.decisions,
      actionItems: meeting.actionItems,
      notes: meeting.notes,
      passwordProtected: meeting.passwordProtected || false,
      password: meeting.password,
      sortOrder: meeting.sortOrder || 0,
      isActive: meeting.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    
    meetings.push(newMeeting);
    saveData(STORAGE_KEYS.project_meetings, meetings);
    return newMeeting;
  }
};

export const deleteProjectMeeting = async (id: string): Promise<boolean> => {
  const meetings = getData<ProjectMeeting>(STORAGE_KEYS.project_meetings);
  const filtered = meetings.filter(m => m.id !== id);
  
  if (filtered.length === meetings.length) {
    return false;
  }
  
  saveData(STORAGE_KEYS.project_meetings, filtered);
  return true;
};

// 客户项目管理
export const getClientProjects = async (): Promise<ClientProject[]> => {
  return getData<ClientProject>(STORAGE_KEYS.client_projects);
};

export const saveClientProject = async (
  project: Partial<ClientProject>
): Promise<ClientProject | null> => {
  const projects = getData<ClientProject>(STORAGE_KEYS.client_projects);
  const now = new Date().toISOString();
  
  console.log('💾 保存客户项目:', project);
  
  if (project.id) {
    // 更新现有记录
    const index = projects.findIndex(p => p.id === project.id);
    if (index === -1) {
      console.error('客户项目不存在:', project.id);
      return null;
    }
    
    const updated: ClientProject = {
      ...projects[index],
      ...project,
      updatedAt: now,
    } as ClientProject;
    
    console.log('✅ 更新现有客户:', updated);
    
    projects[index] = updated;
    saveData(STORAGE_KEYS.client_projects, projects);
    return updated;
  } else {
    // 创建新记录
    const newProject: ClientProject = {
      id: uuidv4(),
      clientName: project.clientName || '新客户',
      projectName: project.projectName,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status || 'active',
      description: project.description,
      currentMilestoneId: project.currentMilestoneId,
      currentGoalId: project.currentGoalId,
      sortOrder: project.sortOrder || 0,
      isActive: project.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    
    console.log('✅ 创建新客户:', newProject);
    
    projects.push(newProject);
    saveData(STORAGE_KEYS.client_projects, projects);
    return newProject;
  }
};

export const deleteClientProject = async (id: string): Promise<boolean> => {
  const projects = getData<ClientProject>(STORAGE_KEYS.client_projects);
  const filtered = projects.filter(p => p.id !== id);
  
  // 同时删除关联的项目里程碑
  const projectMilestones = getData<ProjectMilestone>(STORAGE_KEYS.project_milestones);
  const filteredPM = projectMilestones.filter(pm => pm.projectId !== id);
  saveData(STORAGE_KEYS.project_milestones, filteredPM);
  
  if (filtered.length === projects.length) {
    return false;
  }
  
  saveData(STORAGE_KEYS.client_projects, filtered);
  return true;
};

// 项目里程碑关联管理
export const getProjectMilestones = async (projectId: string): Promise<ProjectMilestone[]> => {
  const projectMilestones = getData<ProjectMilestone>(STORAGE_KEYS.project_milestones);
  return projectMilestones.filter(pm => pm.projectId === projectId);
};

export const saveProjectMilestone = async (
  projectMilestone: Partial<ProjectMilestone>
): Promise<ProjectMilestone | null> => {
  const projectMilestones = getData<ProjectMilestone>(STORAGE_KEYS.project_milestones);
  const now = new Date().toISOString();
  
  if (projectMilestone.id) {
    const index = projectMilestones.findIndex(pm => pm.id === projectMilestone.id);
    if (index === -1) {
      console.error('项目里程碑不存在:', projectMilestone.id);
      return null;
    }
    
    const updated: ProjectMilestone = {
      ...projectMilestones[index],
      ...projectMilestone,
      updatedAt: now,
    } as ProjectMilestone;
    
    projectMilestones[index] = updated;
    saveData(STORAGE_KEYS.project_milestones, projectMilestones);
    return updated;
  } else {
    const newProjectMilestone: ProjectMilestone = {
      id: uuidv4(),
      projectId: projectMilestone.projectId || '',
      milestoneId: projectMilestone.milestoneId || '',
      status: projectMilestone.status || 'pending',
      startDate: projectMilestone.startDate,
      endDate: projectMilestone.endDate,
      actualDate: projectMilestone.actualDate,
      notes: projectMilestone.notes,
      sortOrder: projectMilestone.sortOrder || 0,
      createdAt: now,
      updatedAt: now,
    };
    
    projectMilestones.push(newProjectMilestone);
    saveData(STORAGE_KEYS.project_milestones, projectMilestones);
    return newProjectMilestone;
  }
};

export const deleteProjectMilestone = async (id: string): Promise<boolean> => {
  const projectMilestones = getData<ProjectMilestone>(STORAGE_KEYS.project_milestones);
  const filtered = projectMilestones.filter(pm => pm.id !== id);
  
  if (filtered.length === projectMilestones.length) {
    return false;
  }
  
  saveData(STORAGE_KEYS.project_milestones, filtered);
  return true;
};

// 获取前台显示的战略客户数据
export const getStrategyCompanionData = async () => {
  const [milestones, goals, events, documents, meetings] = await Promise.all([
    getStrategicMilestones(),
    getStrategicGoals(),
    getProjectEvents(),
    getProjectDocuments(),
    getProjectMeetings(),
  ]);

  // 获取每个目标的指标
  const goalsWithMetrics = await Promise.all(
    goals.map(async (goal) => ({
      ...goal,
      metrics: await getGoalMetrics(goal.id),
    }))
  );

  return {
    milestones,
    goals: goalsWithMetrics,
    events,
    documents,
    meetings,
  };
};

// 清除所有本地数据（用于测试）
export const clearAllLocalData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  localStorage.removeItem('yiyu_initialized');
  console.log('🗑️ 所有本地数据已清除');
};

// 导出本地数据（用于迁移到线上）
export const exportLocalData = () => {
  const data: Record<string, unknown> = {};
  
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    data[name] = getData(key);
  });
  
  return JSON.stringify(data, null, 2);
};

console.log('✅ 本地数据服务已加载');
console.log('💡 使用 localStorage 进行数据存储');
console.log('🔄 刷新页面后数据会保持');
