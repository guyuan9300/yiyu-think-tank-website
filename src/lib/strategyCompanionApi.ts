import { authRequest } from './authHttp';

export type StrategyAccessMode = 'public' | 'project' | 'admin';

export interface StrategyProjectSummary {
  id: string;
  clientName: string;
  projectName: string;
  description?: string;
  slug?: string;
  logoUrl?: string;
  isPublished?: boolean;
  publishedAt?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StrategyHeroBlock {
  mission: string;
  vision: string;
  values: string[];
}

export interface StrategyNorthBlock {
  northStar: string;
  northStarMetrics: string[];
  annualDeliverables: string[];
  next14Days: string[];
}

export interface StrategyTimelineItem {
  stage: string;
  date: string;
  status: 'done' | 'current' | 'pending';
  detail: string;
}

export interface StrategyGoalItem {
  title: string;
  oneLiner: string;
  progress: number;
  kpis: string[];
  risks: string[];
}

export interface StrategyRecentEvent {
  title: string;
  date: string;
  duration: string;
  people: string;
  scope: string;
  doneItems: string[];
  valueItems: string[];
}

export interface StrategyDocumentItem {
  title: string;
  date: string;
  desc: string;
  link: string;
}

export interface StrategyMeetingItem {
  title: string;
  date: string;
  duration: string;
  attendees: string;
  keyPeople: string;
  topic: string;
  link: string;
}

export interface StrategyLearningResource {
  id?: string;
  projectId?: string;
  projectName?: string;
  title: string;
  summary: string;
  relation: string;
  detail: string[];
  kind: '文章' | '报告' | '课程';
  link: string;
  sourceType?: 'manual' | 'internal';
  internalType?: 'article' | 'report' | 'book' | 'methodology';
  internalId?: string;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StrategyProjectSnapshot {
  project: StrategyProjectSummary & {
    mission?: string;
    vision?: string;
    values?: string[];
    northStar?: string;
    northStarMetrics?: string[];
    annualDeliverables?: string[];
    next14Days?: string[];
  };
  hero: StrategyHeroBlock;
  north: StrategyNorthBlock;
  timeline: StrategyTimelineItem[];
  goals: StrategyGoalItem[];
  latest: StrategyRecentEvent[];
  docs: StrategyDocumentItem[];
  meetings: StrategyMeetingItem[];
  learning: StrategyLearningResource[];
}

export interface StrategyAccessResult {
  mode: StrategyAccessMode;
  project?: StrategyProjectSummary;
  projects?: StrategyProjectSummary[];
}

export function fetchStrategyAccess() {
  return authRequest<StrategyAccessResult>('/strategy-access', undefined, { withAuth: true });
}

export function fetchStrategyProjects(scope: 'admin' | 'published') {
  return authRequest<StrategyProjectSummary[]>(`/strategy/projects?scope=${scope}`, undefined, { withAuth: scope === 'admin' });
}

export function fetchStrategyProjectSnapshot(projectId: string, withAuth = true) {
  return authRequest<StrategyProjectSnapshot>(
    `/strategy/projects/${encodeURIComponent(projectId)}/snapshot`,
    undefined,
    { withAuth }
  );
}

export function saveStrategyProjectSnapshot(projectId: string, snapshot: StrategyProjectSnapshot) {
  return authRequest<StrategyProjectSnapshot>(
    `/strategy/projects/${encodeURIComponent(projectId)}/snapshot`,
    {
      method: 'POST',
      body: JSON.stringify(snapshot),
    },
    { withAuth: true }
  );
}

export function publishStrategyProject(projectId: string, publish: boolean) {
  return authRequest<StrategyProjectSummary>(
    `/strategy/projects/${encodeURIComponent(projectId)}/publish`,
    {
      method: 'POST',
      body: JSON.stringify({ publish }),
    },
    { withAuth: true }
  );
}

export function fetchStrategyLearningResources() {
  return authRequest<StrategyLearningResource[]>('/strategy/learning-resources', undefined, { withAuth: true });
}

export function saveStrategyLearningResource(resource: StrategyLearningResource & { projectId: string }) {
  return authRequest<StrategyLearningResource>(
    '/strategy/learning-resources/upsert',
    {
      method: 'POST',
      body: JSON.stringify(resource),
    },
    { withAuth: true }
  );
}

export function deleteStrategyLearningResource(resourceId: string) {
  return authRequest<null>(
    `/strategy/learning-resources/${encodeURIComponent(resourceId)}`,
    { method: 'DELETE' },
    { withAuth: true }
  );
}

export const PUBLIC_STRATEGY_SHOWCASE: StrategyProjectSnapshot = {
  project: {
    id: 'public-showcase',
    clientName: '战略陪伴展示',
    projectName: '战略陪伴展示',
    description: '面向未绑定机构用户的固定展示页。',
    slug: 'public-showcase',
    logoUrl: '',
    isPublished: false,
  },
  hero: {
    mission: '把方向、行动与复盘放在同一张长期画布里，让战略陪伴真正成为组织持续进化的支点。',
    vision: '用一套清晰、安静、可持续的工作界面，帮助团队反复回到使命、目标与关键动作。',
    values: ['方向清晰', '协作可见', '节奏稳定', '长期复盘'],
  },
  north: {
    northStar: '围绕机构使命、季度目标和近期行动，形成一套可持续回看的战略陪伴工作台。',
    northStarMetrics: [
      '使命、愿景、价值观在一个界面内持续更新',
      '季度目标、里程碑、近期事件彼此联动',
      '文档、会议、学习资源与执行节奏保持同步',
    ],
    annualDeliverables: ['战略画布', '目标追踪', '文档沉淀', '会议记录', '学习资源'],
    next14Days: ['登录后查看机构页', '保持周节奏更新', '在关键节点做复盘'],
  },
  timeline: [
    { stage: '方向澄清', date: '持续进行', status: 'current', detail: '回到使命、愿景与关键问题，明确当前最重要的战略焦点。' },
    { stage: '目标共识', date: '按季度更新', status: 'pending', detail: '围绕季度目标和关键指标，形成跨团队的一致行动语言。' },
    { stage: '执行复盘', date: '按月回看', status: 'pending', detail: '把会议、文档、学习资源和近期事件沉淀在同一页中。' },
  ],
  goals: [
    {
      title: '目标一：让团队对方向有共同理解',
      oneLiner: '使命、愿景、价值观和北极星始终可见。',
      progress: 100,
      kpis: ['方向信息持续更新', '团队成员可随时回看'],
      risks: ['方向讨论被日常事务淹没'],
    },
    {
      title: '目标二：让执行过程可追踪',
      oneLiner: '里程碑、事件、文档和会议保持同步。',
      progress: 100,
      kpis: ['关键动作可追踪', '重要资料可沉淀'],
      risks: ['材料分散在不同工具中'],
    },
  ],
  latest: [
    {
      title: '战略陪伴工作台展示',
      date: '当前',
      duration: '长期使用',
      people: '机构管理层与核心执行团队',
      scope: '展示机构战略陪伴页面的结构与节奏。',
      doneItems: ['使命与目标同屏', '资料与会议集中沉淀'],
      valueItems: ['降低信息分散成本', '帮助团队稳定复盘'],
    },
  ],
  docs: [
    { title: '战略陪伴说明', date: '当前', desc: '登录并绑定机构后，可查看对应机构的真实陪伴页。', link: '' },
  ],
  meetings: [
    { title: '战略陪伴示例', date: '当前', duration: '持续更新', attendees: '机构团队', keyPeople: '核心负责人', topic: '围绕战略目标持续协作与复盘', link: '' },
  ],
  learning: [
    { title: '什么是战略陪伴', summary: '战略陪伴不是一次性方案，而是持续的方向对齐与执行支持。', relation: '用于理解页面结构', detail: ['登录绑定机构后可查看真实内容'], kind: '文章', link: '' },
  ],
};
