import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  LayoutGrid,
  Sparkles,
  ClipboardList,
  CalendarClock,
  MessageSquare,
  Files,
  GraduationCap,
  Plus,
  Pencil,
  CheckCircle,
  Clock3,
  AlertCircle,
} from 'lucide-react';
import { Header } from './Header';

type Mode = 'immersive' | 'work';

const card = 'bg-white/92 backdrop-blur-sm rounded-[22px] border border-slate-200/70 shadow-[0_8px_28px_rgba(15,23,42,0.045)]';

const fallbackTimeline = [
  { stage: '战略启动', date: '2024年1月', detail: '完成战略范围定义与关键问题识别。', status: 'done' as const },
  { stage: '能力诊断', date: '2024年3月', detail: '完成组织能力诊断与优先级排序。', status: 'done' as const },
  { stage: '战略共创', date: '2024年6月', detail: '推进目标共创与关键路径梳理。', status: 'current' as const },
  { stage: '执行赋能', date: '2024年9月', detail: '建立执行机制与协作流程。', status: 'pending' as const },
  { stage: '复盘迭代', date: '2024年12月', detail: '形成复盘结论与下一周期策略。', status: 'pending' as const },
];

type ClientPreset = {
  mission: string;
  vision: string;
  values: string[];
  northStar: string;
  northStarMetrics: string[];
  annualDeliverables: string[];
  next14Days: string[];
  timeline: { stage: string; date: string; detail: string; status: 'done' | 'current' | 'pending' }[];
  goals: { title: string; oneLiner: string; progress: number; kpis: string[]; risks: string[] }[];
  latest: {
    title: string;
    date: string;
    duration: string;
    people: string;
    scope: string;
    doneItems: string[];
    valueItems: string[];
  }[];
  docs: { title: string; date: string; desc: string; link: string }[];
  meetings: { title: string; date: string; duration: string; attendees: string; keyPeople: string; topic: string; link: string }[];
  learning: { title: string; summary: string; relation: string; detail: string[]; kind?: '文章' | '报告' | '课程'; link?: string }[];
};

const clientMeta: Record<string, { logo: string }> = {
  '蓝信封': { logo: 'images/cases/blue-letter.png' },
  '日慈基金会': { logo: 'images/cases/rici-foundation.png' },
};

const clientData: Record<string, ClientPreset> = {
  '蓝信封': {
    mission: '支持乡村儿童心理健康与成长，让“被看见、被倾听、被理解”成为可持续的日常能力。',
    vision: '让更多乡村儿童获得持续、温暖、可及的心理陪伴；让学校、家庭与社会形成长期协同支持网络。',
    values: ['深度陪伴', '系统思维', '价值共创', '长期主义', '循证实践'],
    northStar: '到 2026 年底，构建“热线 + 社群 + 学校协作”三位一体的心理支持闭环，并形成可复制的区域模型。',
    northStarMetrics: [
      '覆盖学校数量：目标 120 所，当前 86 所（71.7%）',
      '志愿者月均有效陪伴时长：目标 520 小时，当前 436 小时（83.8%）',
      '高风险个案转介闭环率：目标 95%，当前 89%（需强化协同）',
      '服务对象满意度：目标 4.7/5，当前 4.6/5（稳定）',
    ],
    annualDeliverables: [
      '发布《乡村儿童心理支持协作手册》v2.0（含学校工作流模板）',
      '完成华南区域 3 个试点县的跨机构协同机制落地与复盘报告',
      '搭建“志愿者成长路径”并上线 4 门核心微课，覆盖督导与伦理模块',
      '建立季度案例库：每季度至少沉淀 12 例结构化典型案例',
      '完成年度品牌叙事更新，形成统一外部传播框架与视觉规范',
    ],
    next14Days: [
      '与两所试点学校完成春季学期协作协议补充条款确认（负责人：项目总监）',
      '完成高风险个案转介 SOP 二次演练与问题清单修订（负责人：督导）',
      '发布 3 月志愿者轮训课表并确认讲师排班（负责人：学习运营）',
      '与合作医院确认值班窗口和紧急转介联系人台账（负责人：外联）',
      '整理 2026Q1 叙事样本素材，准备月度对外传播包（负责人：品牌）',
    ],
    timeline: [
      {
        stage: '战略启动',
        date: '2024年1月',
        status: 'done',
        detail: '完成使命愿景初稿、治理边界定义与核心服务对象重定向。',
      },
      {
        stage: '能力诊断',
        date: '2024年3月',
        status: 'done',
        detail: '完成组织能力盘点（项目、督导、数据、品牌、筹款）并给出优先级矩阵。',
      },
      {
        stage: '战略共创',
        date: '2024年6月',
        status: 'current',
        detail: '共创“热线-社群-学校”协同机制，梳理年度关键战役与角色分工。',
      },
      {
        stage: '执行赋能',
        date: '2024年9月',
        status: 'pending',
        detail: '沉淀流程化工具包，推进数据看板与周/月复盘节奏。',
      },
      {
        stage: '复盘迭代',
        date: '2024年12月',
        status: 'pending',
        detail: '形成年度复盘报告，确认下一年度扩展策略与资源投入重心。',
      },
    ],
    goals: [
      {
        title: '目标A：学校协作机制稳定化',
        oneLiner: '把“单点合作”升级为“制度协作”，确保每个试点学校有可持续执行节奏。',
        progress: 72,
        kpis: [
          '校内联络教师双周例会达成率：83%（目标 90%）',
          '班主任心理支持工具包使用率：61%（目标 75%）',
          '跨部门协作工单平均响应时长：2.1 天（目标 ≤2天）',
        ],
        risks: ['节假日导致例会中断', '新加入学校的负责人轮岗频繁，交接成本偏高'],
      },
      {
        title: '目标B：高风险个案转介闭环',
        oneLiner: '提升识别—转介—回访的一致性，降低流程断点。',
        progress: 65,
        kpis: [
          '高风险识别准确率：88%（目标 92%）',
          '48小时内完成转介比例：84%（目标 90%）',
          '回访记录完整度：79%（目标 95%）',
        ],
        risks: ['外部医疗资源窗口时段不稳定', '家校沟通模板不统一导致信息缺失'],
      },
      {
        title: '目标C：志愿者成长路径与质量提升',
        oneLiner: '让培训、实战、督导形成闭环，提升陪伴稳定性和伦理边界意识。',
        progress: 58,
        kpis: [
          '核心课程完课率：74%（目标 85%）',
          '一线志愿者留存率：67%（目标 78%）',
          '督导反馈闭环完成率：62%（目标 80%）',
        ],
        risks: ['培训节奏与项目期冲突', '督导资源排班不足影响反馈时效'],
      },
    ],
    latest: [
      {
        title: 'Q1 战略对齐会（蓝信封 x 益语）',
        date: '2026-02-21',
        duration: '95 分钟',
        people: '6 人（项目、督导、品牌、外联）',
        scope: '学校协作、个案转介、品牌叙事',
        doneItems: [
          'Q2 必须把“学校协作 SOP”固化为可移交模板，减少人员变化带来的执行波动。',
          '个案转介环节的瓶颈不是识别能力，而是信息传递标准不统一。',
          '品牌叙事需从“活动报道”转向“问题治理视角”的连续表达。',
          '志愿者管理需增加“情绪负荷管理”模块，降低疲劳离岗。',
        ],
        valueItems: [
          '3月第一周完成 SOP 文档 v1.3 并组织一次跨角色演练。',
          '建立转介信息字段最小集并接入会议纪要模板。',
          '发布 3 条案例型长图文，验证新叙事框架的传播反馈。',
        ],
      },
      {
        title: '学校协作工作坊复盘会',
        date: '2026-02-14',
        duration: '80 分钟',
        people: '8 人（校方 + 项目团队）',
        scope: '校方协作机制与执行模板优化',
        doneItems: [
          '校方最需要的是“可执行清单”，而非概念说明。',
          '班主任端模板过长，建议拆分为“课堂前/中/后”三段。',
          '数据回传建议从周报改为双周报，降低填写压力。',
        ],
        valueItems: [
          '优化模板长度并上线轻量版。',
          '试运行双周报并比较数据质量。',
          '下次工作坊加入“家长沟通”情境演练。',
        ],
      },
    ],
    docs: [
      {
        title: '《乡村儿童心理支持协作手册》v2.0（草案）',
        date: '2026-02-18',
        desc: '涵盖服务边界、转介规则、学校协作流程、督导机制与危机响应。',
        link: 'https://open.feishu.cn/document',
      },
      {
        title: '高风险个案转介 SOP v1.3（流程图 + 表单模板）',
        date: '2026-02-16',
        desc: '新增“信息字段最小集”和“48小时响应路径”示意。',
        link: 'https://open.feishu.cn/document',
      },
      {
        title: '志愿者成长路径设计（课程地图 + 评估量表）',
        date: '2026-02-12',
        desc: '用于追踪完课、实战、督导反馈与留存风险。',
        link: 'https://open.feishu.cn/document',
      },
      {
        title: 'Q1 对外传播叙事包（案例稿 + 视觉模板）',
        date: '2026-02-10',
        desc: '包含 3 套长图文模板、2 份案例稿与采访提纲。',
        link: 'https://open.feishu.cn/document',
      },
    ],
    meetings: [
      {
        title: '战略对齐月会（2月）',
        date: '2026-02-21',
        duration: '95 分钟',
        attendees: '6 人',
        keyPeople: '项目总监、督导负责人、品牌负责人',
        topic: '确认 Q2 协作重点与流程标准化优先级',
        link: 'https://open.feishu.cn/document',
      },
      {
        title: '学校协作工作坊',
        date: '2026-02-14',
        duration: '80 分钟',
        attendees: '8 人',
        keyPeople: '校方联络人、项目经理、学习运营',
        topic: '优化班主任端执行模板与双周回传机制',
        link: 'https://open.feishu.cn/document',
      },
    ],
    learning: [
      {
        title: '组织系统设计：从使命到执行闭环',
        summary: '帮助团队把价值观转为流程规则，避免“口号化战略”。',
        relation: '关联目标：学校协作机制稳定化',
        detail: ['阅读时长：18 分钟', '建议角色：项目负责人/校方联络人', '输出：本组织协作规则草案'],
        kind: '文章',
        link: 'https://open.feishu.cn/document',
      },
      {
        title: '公益组织危机个案响应机制（实践指南）',
        summary: '围绕识别、转介、回访，建立高风险个案的闭环治理能力。',
        relation: '关联目标：高风险个案转介闭环',
        detail: ['报告页数：42 页', '建议角色：督导/外联/项目经理', '输出：本地化转介路径图'],
        kind: '报告',
        link: 'https://open.feishu.cn/document',
      },
      {
        title: '学习型组织在公益场景中的落地路径',
        summary: '将培训、督导、复盘合并成持续改进系统，而不是一次性活动。',
        relation: '关联目标：志愿者成长路径与质量提升',
        detail: ['课程时长：63 分钟', '建议角色：学习运营/督导', '输出：季度学习节奏表'],
        kind: '课程',
        link: 'https://open.feishu.cn/document',
      },
    ],
  },
  '日慈基金会': {
    // 复用同结构，先做内容压力测试
    mission: '让生命教育与心理支持进入更广泛、可持续的公共服务场景。',
    vision: '构建“机构—学校—社区”联动的心理健康支持网络，让支持可及且可持续。',
    values: ['长期主义', '同理共情', '专业守则', '协同治理', '系统优化'],
    northStar: '完成 3 个城市示范场景的服务模型验证，并形成可复制的扩展模板。',
    northStarMetrics: ['示范场景数量：2/3', '年度服务触达：78%', '协作机构满意度：4.5/5', '复盘闭环完成率：81%'],
    annualDeliverables: ['示范城市模型文档', '协作手册', '课程工具包', '数据看板上线'],
    next14Days: ['完成示范点排期', '更新培训课纲', '完善联络机制', '完成月度复盘草案'],
    timeline: fallbackTimeline.map((x, i) => ({ ...x, detail: `阶段说明 ${i + 1}：围绕组织协作与执行推进。`, status: x.status })),
    goals: [
      { title: '示范场景验证', oneLiner: '聚焦可复制性', progress: 64, kpis: ['进度 64%', '反馈 4.5/5', '完成 7/10'], risks: ['合作排期'] },
      { title: '课程体系升级', oneLiner: '提高实操性', progress: 58, kpis: ['课程完课 72%', '满意度 4.6', '输出 12 套'], risks: ['讲师排期'] },
      { title: '数据化治理', oneLiner: '提升复盘效率', progress: 49, kpis: ['数据回传 68%', '报表时效 +35%', '缺失率 11%'], risks: ['字段不统一'] },
    ],
    latest: [
      {
        title: '月度运营复盘会',
        date: '2026-02-20',
        duration: '88 分钟',
        people: '7 人',
        scope: '示范点推进与资源排期',
        doneItems: ['明确下一阶段资源投放顺序', '统一指标口径', '确定示范点优先级'],
        valueItems: ['更新里程碑', '补齐关键数据', '提交复盘纪要'],
      },
    ],
    docs: [
      { title: '示范场景运行手册', date: '2026-02-18', desc: '覆盖角色职责与协作路径。', link: 'https://open.feishu.cn/document' },
      { title: '课程设计框架', date: '2026-02-15', desc: '课程目标与评估设计。', link: 'https://open.feishu.cn/document' },
      { title: '数据字段字典', date: '2026-02-12', desc: '统一数据口径。', link: 'https://open.feishu.cn/document' },
    ],
    meetings: [
      {
        title: '示范点协同会',
        date: '2026-02-16',
        duration: '75 分钟',
        attendees: '7 人',
        keyPeople: '项目负责人、教研负责人、外部合作方代表',
        topic: '示范点排期与资源配置确认',
        link: 'https://open.feishu.cn/document',
      },
    ],
    learning: [
      { title: '组织协同设计', summary: '建立跨团队协作机制。', relation: '关联目标：示范场景验证', detail: ['18分钟', '附模板'], kind: '文章', link: 'https://open.feishu.cn/document' },
      { title: '课程评估方法', summary: '提升评估有效性。', relation: '关联目标：课程体系升级', detail: ['30分钟', '含案例'], kind: '课程', link: 'https://open.feishu.cn/document' },
      { title: '数据治理入门', summary: '快速搭建数据闭环。', relation: '关联目标：数据化治理', detail: ['42页', '含字段表'], kind: '报告', link: 'https://open.feishu.cn/document' },
    ],
  },
};

const ADMIN_OVERRIDE_STORAGE_KEY = 'yiyu_strategy_companion_admin_overrides_v1';

type AdminOverridePayload = {
  overrideHero?: Record<string, { mission: string; vision: string; values: string[] }>;
  overrideNorth?: Record<string, { northStar: string; northStarMetrics: string[]; annualDeliverables: string[]; next14Days: string[] }>;
  overrideTimeline?: Record<string, ClientPreset['timeline']>;
  overrideGoals?: Record<string, ClientPreset['goals']>;
  overrideRecent?: Record<string, ClientPreset['latest']>;
  overrideDocs?: Record<string, ClientPreset['docs']>;
  overrideMeetings?: Record<string, ClientPreset['meetings']>;
  extraDocs?: Record<string, ClientPreset['docs']>;
  extraMeetings?: Record<string, ClientPreset['meetings']>;
  extraLearning?: Record<string, ClientPreset['learning']>;
  overrideClientMeta?: Record<string, { displayName: string; logoUrl: string }>;
};

export default function AdminStrategyCompanionConceptPage({ onNavigate, showHeader = true, viewMode = 'admin', initialClient = '蓝信封' }: { onNavigate?: (page: string) => void; showHeader?: boolean; viewMode?: 'admin' | 'frontend'; initialClient?: '蓝信封' | '日慈基金会' }) {
  const isFrontend = viewMode === 'frontend';
  const [mode, setMode] = useState<Mode>('immersive');
  const [client, setClient] = useState<'蓝信封' | '日慈基金会'>(initialClient);
  const data = clientData[client];
  const [extraDocs, setExtraDocs] = useState<Record<string, ClientPreset['docs']>>({});
  const [extraMeetings, setExtraMeetings] = useState<Record<string, ClientPreset['meetings']>>({});
  const [extraLearning, setExtraLearning] = useState<Record<string, ClientPreset['learning']>>({});
  const [overrideDocs, setOverrideDocs] = useState<Record<string, ClientPreset['docs']>>({});
  const [overrideMeetings, setOverrideMeetings] = useState<Record<string, ClientPreset['meetings']>>({});
  const [quickDoc, setQuickDoc] = useState({ title: '', desc: '', link: '' });
  const [quickMeeting, setQuickMeeting] = useState({ title: '', topic: '', link: '' });
  const [quickLearning, setQuickLearning] = useState({ title: '', summary: '', relation: '', link: '' });

  const docs = overrideDocs[client] || [...data.docs, ...(extraDocs[client] || [])];
  const meetings = overrideMeetings[client] || [...data.meetings, ...(extraMeetings[client] || [])];
  const learning = [...data.learning, ...(extraLearning[client] || [])];

  const setModeWithDefaults = (m: Mode) => {
    setMode(m);
    if (m === 'immersive') setDrawerType(null);
  };

  useEffect(() => {
    if (isFrontend) {
      setMode('immersive');
      setDrawerType(null);
    }
  }, [isFrontend]);

  const inferLearningKind = (url: string): '文章' | '报告' | '课程' => {
    const u = url.toLowerCase();
    if (u.includes('report') || u.includes('pdf') || u.includes('insight')) return '报告';
    if (u.includes('course') || u.includes('learn') || u.includes('training')) return '课程';
    return '文章';
  };

  const [overrideHero, setOverrideHero] = useState<Record<string, { mission: string; vision: string; values: string[] }>>({});
  const [overrideNorth, setOverrideNorth] = useState<Record<string, { northStar: string; northStarMetrics: string[]; annualDeliverables: string[]; next14Days: string[] }>>({});
  const [overrideTimeline, setOverrideTimeline] = useState<Record<string, ClientPreset['timeline']>>({});
  const [overrideGoals, setOverrideGoals] = useState<Record<string, ClientPreset['goals']>>({});
  const [overrideRecent, setOverrideRecent] = useState<Record<string, ClientPreset['latest']>>({});
  const [overrideClientMeta, setOverrideClientMeta] = useState<Record<string, { displayName: string; logoUrl: string }>>({});
  const [saveHint, setSaveHint] = useState('');

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_OVERRIDE_STORAGE_KEY);
      if (!raw) return;
      const parsed: AdminOverridePayload = JSON.parse(raw);
      if (parsed.overrideHero) setOverrideHero(parsed.overrideHero);
      if (parsed.overrideNorth) setOverrideNorth(parsed.overrideNorth);
      if (parsed.overrideTimeline) setOverrideTimeline(parsed.overrideTimeline);
      if (parsed.overrideGoals) setOverrideGoals(parsed.overrideGoals);
      if (parsed.overrideRecent) setOverrideRecent(parsed.overrideRecent);
      if (parsed.overrideDocs) setOverrideDocs(parsed.overrideDocs);
      if (parsed.overrideMeetings) setOverrideMeetings(parsed.overrideMeetings);
      if (parsed.extraDocs) setExtraDocs(parsed.extraDocs);
      if (parsed.extraMeetings) setExtraMeetings(parsed.extraMeetings);
      if (parsed.extraLearning) setExtraLearning(parsed.extraLearning);
      if (parsed.overrideClientMeta) setOverrideClientMeta(parsed.overrideClientMeta);
    } catch (error) {
      console.warn('读取战略客户后台覆盖数据失败:', error);
    }
  }, []);

  const publishAllChanges = () => {
    const payload: AdminOverridePayload = {
      overrideHero,
      overrideNorth,
      overrideTimeline,
      overrideGoals,
      overrideRecent,
      overrideDocs,
      overrideMeetings,
      extraDocs,
      extraMeetings,
      extraLearning,
      overrideClientMeta,
    };
    localStorage.setItem(ADMIN_OVERRIDE_STORAGE_KEY, JSON.stringify(payload));

    // 同步写入前台原始数据源（dataServiceLocal 使用的 keys），避免“后台改了前台不变”。
    try {
      const now = new Date().toISOString();
      const projectList = JSON.parse(localStorage.getItem('yiyu_client_projects') || '[]');
      const targetName = overrideClientMeta[client]?.displayName;
      const target = projectList.find((p: any) => p.clientName === client || (targetName && p.clientName === targetName));

      if (target?.id) {
        const projectId = target.id as string;

        // 1) client 基础信息（名称/logo/使命愿景）
        const displayName = overrideClientMeta[client]?.displayName || target.clientName;
        const logoUrl = overrideClientMeta[client]?.logoUrl || target.logoUrl;
        const nextProjects = projectList.map((p: any) =>
          p.id === projectId
            ? {
                ...p,
                clientName: displayName,
                logoUrl,
                mission: heroData.mission,
                vision: heroData.vision,
                values: heroData.values,
                northStarMetric: northData.northStar,
                yearlyDeliverables: northData.annualDeliverables,
                updatedAt: now,
              }
            : p
        );
        localStorage.setItem('yiyu_client_projects', JSON.stringify(nextProjects));

        // 2) 里程碑
        const oldMilestones = JSON.parse(localStorage.getItem('yiyu_strategic_milestones') || '[]').filter((x: any) => x.projectId !== projectId);
        const newMilestones = timelineData.map((t: any, idx: number) => ({
          id: `ms_${crypto.randomUUID()}`,
          projectId,
          title: t.stage,
          description: t.detail,
          status: t.status === 'done' ? 'completed' : t.status === 'current' ? 'in-progress' : 'pending',
          phaseOrder: idx + 1,
          participants: [],
          outputs: [],
          milestoneDate: t.date,
          sortOrder: idx + 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }));
        localStorage.setItem('yiyu_strategic_milestones', JSON.stringify([...oldMilestones, ...newMilestones]));

        // 3) 目标
        const oldGoals = JSON.parse(localStorage.getItem('yiyu_strategic_goals') || '[]').filter((x: any) => x.projectId !== projectId);
        const newGoals = goalData.map((g: any) => ({
          id: `goal_${crypto.randomUUID()}`,
          projectId,
          title: g.title,
          description: g.oneLiner || g.description,
          progress: Number(g.progress || 0),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }));
        localStorage.setItem('yiyu_strategic_goals', JSON.stringify([...oldGoals, ...newGoals]));

        // 4) 动态
        const oldEvents = JSON.parse(localStorage.getItem('yiyu_project_events') || '[]').filter((x: any) => x.projectId !== projectId);
        const newEvents = recentData.map((e: any, idx: number) => ({
          id: `evt_${crypto.randomUUID()}`,
          projectId,
          type: 'meeting',
          title: e.title,
          description: e.scope || '',
          eventDate: e.date || now.slice(0, 10),
          details: [...(e.doneItems || []), ...(e.valueItems || [])].join('；'),
          participants: Number((e.people || '').replace(/\D/g, '')) || undefined,
          sortOrder: idx + 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }));
        localStorage.setItem('yiyu_project_events', JSON.stringify([...oldEvents, ...newEvents]));

        // 5) 文档
        const oldDocs = JSON.parse(localStorage.getItem('yiyu_project_documents') || '[]').filter((x: any) => x.projectId !== projectId);
        const newDocs = docs.map((d: any, idx: number) => ({
          id: `doc_${crypto.randomUUID()}`,
          projectId,
          category: 'strategy',
          title: d.title,
          description: d.desc || '',
          docDate: d.date || now.slice(0, 10),
          documentLink: d.link,
          passwordProtected: false,
          sortOrder: idx + 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }));
        localStorage.setItem('yiyu_project_documents', JSON.stringify([...oldDocs, ...newDocs]));

        // 6) 会议
        const oldMeetings = JSON.parse(localStorage.getItem('yiyu_project_meetings') || '[]').filter((x: any) => x.projectId !== projectId);
        const newMeetings = meetings.map((m: any, idx: number) => ({
          id: `meet_${crypto.randomUUID()}`,
          projectId,
          title: m.title,
          meetingDate: m.date || now.slice(0, 10),
          duration: m.duration,
          participantsCount: Number((m.attendees || '').replace(/\D/g, '')) || undefined,
          keyPoints: [m.topic || ''],
          meetingLink: m.link,
          passwordProtected: false,
          sortOrder: idx + 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }));
        localStorage.setItem('yiyu_project_meetings', JSON.stringify([...oldMeetings, ...newMeetings]));

        // 7) 学习资源
        const oldCourses = JSON.parse(localStorage.getItem('yiyu_course_recommendations') || '[]').filter((x: any) => x.projectId !== projectId);
        const newCourses = learning.map((c: any, idx: number) => ({
          id: `course_${crypto.randomUUID()}`,
          projectId,
          title: c.title,
          description: c.summary || '',
          type: 'external',
          url: c.link,
          sortOrder: idx + 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }));
        localStorage.setItem('yiyu_course_recommendations', JSON.stringify([...oldCourses, ...newCourses]));
      }
    } catch (error) {
      console.warn('全局保存同步前台数据失败:', error);
    }

    window.dispatchEvent(new Event('yiyu_data_change'));
    setSaveHint(`已全局保存并同步前台（${new Date().toLocaleTimeString('zh-CN', { hour12: false })}）`);
  };

  const heroData = overrideHero[client] || {
    mission: data.mission,
    vision: data.vision,
    values: data.values,
  };
  const currentDisplayName = overrideClientMeta[client]?.displayName || client;
  const currentLogo = overrideClientMeta[client]?.logoUrl || clientMeta[client]?.logo || '';
  const northData = overrideNorth[client] || {
    northStar: data.northStar,
    northStarMetrics: data.northStarMetrics,
    annualDeliverables: data.annualDeliverables,
    next14Days: data.next14Days,
  };
  const timelineData = overrideTimeline[client] || data.timeline;
  const goalData = overrideGoals[client] || data.goals;
  const recentData = overrideRecent[client] || data.latest;

  const goalCards = useMemo(() => {
    if (mode !== 'work') return goalData;
    const list = [...goalData];
    while (list.length < 4) {
      list.push({
        title: `目标${String.fromCharCode(65 + list.length)}：待补充`,
        oneLiner: '请补充该目标的简述。',
        progress: 0,
        kpis: ['请补充分解目标 1', '请补充分解目标 2'],
        risks: ['请补充可能遇到的问题'],
      });
    }
    return list.slice(0, 4);
  }, [goalData, mode]);

  const updateGoalProgress = (index: number, progress: number) => {
    if (mode !== 'work') return;
    const current = [...goalCards];
    if (!current[index]) return;
    current[index] = { ...current[index], progress };
    setOverrideGoals((prev) => ({ ...prev, [client]: current }));
  };

  const updateTimelineField = (index: number, field: 'stage' | 'date' | 'detail' | 'status', value: string) => {
    const current = [...timelineData];
    if (!current[index]) return;
    current[index] = {
      ...current[index],
      [field]: field === 'status'
        ? ((value === 'done' || value === 'current' || value === 'pending') ? value : 'pending')
        : value,
    } as any;
    setOverrideTimeline((prev) => ({ ...prev, [client]: current }));
  };

  const addTimelineCard = () => {
    const current = [...timelineData];
    current.push({
      stage: '新阶段',
      date: '待定',
      status: 'pending',
      detail: '请补充该阶段说明。',
    });
    setOverrideTimeline((prev) => ({ ...prev, [client]: current }));
  };

  const removeTimelineCard = (index: number) => {
    const current = [...timelineData];
    current.splice(index, 1);
    setOverrideTimeline((prev) => ({ ...prev, [client]: current }));
  };

  const updateRecentEvent = (index: number, patch: Partial<ClientPreset['latest'][number]>) => {
    const current = [...recentData];
    if (!current[index]) return;
    current[index] = { ...current[index], ...patch };
    setOverrideRecent((prev) => ({ ...prev, [client]: current }));
  };

  const editDocItem = (index: number) => {
    const item = docs[index];
    if (!item) return;
    const title = window.prompt('修改文档标题', item.title);
    if (title === null) return;
    const desc = window.prompt('修改文档简介', item.desc);
    if (desc === null) return;
    const link = window.prompt('修改文档链接', item.link);
    if (link === null) return;
    const next = [...docs];
    next[index] = { ...item, title: title.trim() || item.title, desc: desc.trim() || item.desc, link: link.trim() || item.link };
    setOverrideDocs((prev) => ({ ...prev, [client]: next }));
  };

  const deleteDocItem = (index: number) => {
    const next = [...docs];
    next.splice(index, 1);
    setOverrideDocs((prev) => ({ ...prev, [client]: next }));
  };

  const editMeetingItem = (index: number) => {
    const item = meetings[index];
    if (!item) return;
    const title = window.prompt('修改会议标题', item.title);
    if (title === null) return;
    const topic = window.prompt('修改核心议题', item.topic);
    if (topic === null) return;
    const link = window.prompt('修改会议链接', item.link);
    if (link === null) return;
    const next = [...meetings];
    next[index] = { ...item, title: title.trim() || item.title, topic: topic.trim() || item.topic, link: link.trim() || item.link };
    setOverrideMeetings((prev) => ({ ...prev, [client]: next }));
  };

  const deleteMeetingItem = (index: number) => {
    const next = [...meetings];
    next.splice(index, 1);
    setOverrideMeetings((prev) => ({ ...prev, [client]: next }));
  };

  const [drawerType, setDrawerType] = useState<null | 'hero' | 'doc' | 'meeting' | 'learning' | 'north' | 'timeline' | 'goal' | 'recent'>(null);
  const [form, setForm] = useState({
    title: '',
    link: '',
    desc: '',
    date: new Date().toISOString().slice(0, 10),
    duration: '90 分钟',
    attendees: '8 人',
    keyPeople: '',
    topic: '',
    relation: '',
    northStar: '',
    metricsText: '',
    deliverablesText: '',
    nextText: '',
    timelineText: '',
    timelineStage: '',
    timelineDate: '',
    timelineStatus: 'pending',
    timelineDetail: '',
    goalsText: '',
    recentText: '',
    missionText: '',
    visionText: '',
    valuesText: '',
  });

  const openDrawer = (type: 'hero' | 'doc' | 'meeting' | 'learning' | 'north' | 'timeline' | 'goal' | 'recent') => {
    if (mode !== 'work') return;

    const seedTimeline = timelineData.map((t) => `${t.stage}|${t.date}|${t.status}|${t.detail}`).join('\n');
    const seedGoals = goalData
      .map((g) => `${g.title}|${g.oneLiner}|${g.progress}|${g.kpis.join('；')}|${g.risks.join('；')}`)
      .join('\n');
    const seedRecent = recentData
      .map((r) => `${r.title}|${r.date}|${r.duration}|${r.people}|${r.scope}|${r.doneItems.join('；')}|${r.valueItems.join('；')}`)
      .join('\n');

    setForm({
      title: '',
      link: '',
      desc: '',
      date: new Date().toISOString().slice(0, 10),
      duration: '90 分钟',
      attendees: '8 人',
      keyPeople: '',
      topic: '',
      relation: '',
      northStar: northData.northStar,
      metricsText: northData.northStarMetrics.join('\n'),
      deliverablesText: northData.annualDeliverables.join('\n'),
      nextText: northData.next14Days.join('\n'),
      timelineText: seedTimeline,
      timelineStage: '',
      timelineDate: '',
      timelineStatus: 'pending',
      timelineDetail: '',
      goalsText: seedGoals,
      recentText: seedRecent,
      missionText: heroData.mission,
      visionText: heroData.vision,
      valuesText: heroData.values.join('\n'),
    });
    setDrawerType(type);
  };

  const addTimelineItem = () => {
    if (!form.timelineStage.trim()) return;
    const line = `${form.timelineStage.trim()}|${form.timelineDate || '待定'}|${form.timelineStatus}|${form.timelineDetail.trim() || '请补充关键内容'}`;
    setForm((f) => ({
      ...f,
      timelineText: f.timelineText ? `${f.timelineText}\n${line}` : line,
      timelineStage: '',
      timelineDate: '',
      timelineStatus: 'pending',
      timelineDetail: '',
    }));
  };

  const submitDrawer = () => {
    if (drawerType === 'hero') {
      setOverrideHero((prev) => ({
        ...prev,
        [client]: {
          mission: form.missionText || heroData.mission,
          vision: form.visionText || heroData.vision,
          values: form.valuesText.split('\n').map((x) => x.trim()).filter(Boolean),
        },
      }));
      setDrawerType(null);
      return;
    }

    if (drawerType === 'north') {
      setOverrideNorth((prev) => ({
        ...prev,
        [client]: {
          northStar: form.northStar || northData.northStar,
          northStarMetrics: form.metricsText.split('\n').map((x) => x.trim()).filter(Boolean),
          annualDeliverables: form.deliverablesText.split('\n').map((x) => x.trim()).filter(Boolean),
          next14Days: form.nextText.split('\n').map((x) => x.trim()).filter(Boolean),
        },
      }));
      setDrawerType(null);
      return;
    }

    if (drawerType === 'timeline') {
      const parsed = form.timelineText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [stage = '', date = '', status = 'pending', detail = ''] = line.split('|');
          const s = (status.trim() as 'done' | 'current' | 'pending');
          return { stage: stage.trim(), date: date.trim(), status: ['done', 'current', 'pending'].includes(s) ? s : 'pending', detail: detail.trim() };
        })
        .filter((x) => x.stage);
      if (parsed.length) setOverrideTimeline((prev) => ({ ...prev, [client]: parsed }));
      setDrawerType(null);
      return;
    }

    if (drawerType === 'goal') {
      const parsed = form.goalsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [title = '', oneLiner = '', progress = '0', kpis = '', risks = ''] = line.split('|');
          return {
            title: title.trim(),
            oneLiner: oneLiner.trim(),
            progress: Math.max(0, Math.min(100, Number(progress.trim()) || 0)),
            kpis: kpis.split('；').map((x) => x.trim()).filter(Boolean),
            risks: risks.split('；').map((x) => x.trim()).filter(Boolean),
          };
        })
        .filter((x) => x.title);
      if (parsed.length) setOverrideGoals((prev) => ({ ...prev, [client]: parsed }));
      setDrawerType(null);
      return;
    }


    if (drawerType === 'recent') {
      const parsed = form.recentText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [title = '', date = '', duration = '', people = '', scope = '', done = '', value = ''] = line.split('|');
          return {
            title: title.trim(),
            date: date.trim(),
            duration: duration.trim() || '90 分钟',
            people: people.trim() || '跨部门协作小组',
            scope: scope.trim() || '项目推进与对齐',
            doneItems: done.split('；').map((x) => x.trim()).filter(Boolean),
            valueItems: value.split('；').map((x) => x.trim()).filter(Boolean),
          };
        })
        .filter((x) => x.title);
      if (parsed.length) setOverrideRecent((prev) => ({ ...prev, [client]: parsed }));
      setDrawerType(null);
      return;
    }

    if (!form.title.trim() || !form.link.trim()) return;

    if (drawerType === 'doc') {
      setExtraDocs((prev) => ({
        ...prev,
        [client]: [...(prev[client] || []), { title: form.title.trim(), date: form.date, desc: form.desc || '文档简介待补充', link: form.link.trim() }],
      }));
    }

    if (drawerType === 'meeting') {
      setExtraMeetings((prev) => ({
        ...prev,
        [client]: [
          ...(prev[client] || []),
          {
            title: form.title.trim(),
            date: form.date,
            duration: form.duration || '90 分钟',
            attendees: form.attendees || '8 人',
            keyPeople: form.keyPeople || '项目负责人、核心成员',
            topic: form.topic || '核心议题待补充',
            link: form.link.trim(),
          },
        ],
      }));
    }

    if (drawerType === 'learning') {
      const kind = inferLearningKind(form.link);
      setExtraLearning((prev) => ({
        ...prev,
        [client]: [
          ...(prev[client] || []),
          {
            title: form.title.trim(),
            summary: form.desc || '资源简介待补充',
            relation: form.relation || '关联目标：待补充',
            detail: ['链接已粘贴，可继续补充标签'],
            kind,
            link: form.link.trim(),
          },
        ],
      }));
    }

    setDrawerType(null);
  };

  const spacing = mode === 'immersive' ? 'space-y-12 lg:space-y-14' : 'space-y-8';

  const SectionHeader = ({
    title,
    subtitle,
    icon,
    action,
  }: {
    title: string;
    subtitle: string;
    icon: ReactNode;
    action?: ReactNode;
  }) => (
    <div className="w-full flex items-center justify-between mb-5 text-left">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 grid place-items-center">{icon}</div>
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-slate-800">{title}</h2>
          {subtitle ? <p className="text-[13px] text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {showHeader ? <Header isLoggedIn userType="client" onNavigate={onNavigate} /> : null}

      <main className={`max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 ${showHeader ? 'pt-24' : 'pt-6'} pb-20 ${spacing}`}>
        <section className={`${card} p-10 sm:p-12 bg-gradient-to-b from-white to-slate-50/70 border-slate-200/80`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-10">
            <div className="flex items-center gap-3">
              {currentLogo ? <img src={currentLogo} alt={currentDisplayName} className="w-10 h-10 rounded-xl object-cover border border-slate-100" /> : <div className="w-10 h-10 rounded-xl bg-slate-100" />}
              <h2 className="text-[40px] sm:text-[44px] leading-none font-semibold tracking-[-0.02em] text-slate-900">{currentDisplayName}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isFrontend && (
                <select className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px]" value={client} onChange={(e) => setClient(e.target.value as any)}>
                  <option>蓝信封</option>
                  <option>日慈基金会</option>
                </select>
              )}
              {!isFrontend && mode === 'work' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const nextName = window.prompt('请输入客户名称', currentDisplayName);
                      if (nextName === null) return;
                      setOverrideClientMeta((prev) => ({ ...prev, [client]: { displayName: nextName.trim() || currentDisplayName, logoUrl: currentLogo } }));
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    编辑客户名称
                  </button>
                  <button
                    onClick={() => {
                      const nextLogo = window.prompt('请输入客户 Logo URL', currentLogo);
                      if (nextLogo === null) return;
                      setOverrideClientMeta((prev) => ({ ...prev, [client]: { displayName: currentDisplayName, logoUrl: nextLogo.trim() || currentLogo } }));
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    编辑客户 Logo
                  </button>
                </div>
              )}
              {!isFrontend && (
                <>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                    <button onClick={() => setModeWithDefaults('immersive')} className={`px-3 py-1.5 rounded-lg text-[13px] ${mode === 'immersive' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>沉浸模式</button>
                    <button onClick={() => setModeWithDefaults('work')} className={`px-3 py-1.5 rounded-lg text-[13px] ${mode === 'work' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>编辑模式</button>
                  </div>
                  <button onClick={publishAllChanges} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700">全局保存并同步前台</button>
                </>
              )}
            </div>
          </div>

          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 mb-4">Strategic Companion</p>
          <p className="text-[36px] sm:text-[40px] leading-[1.25] text-slate-500 italic font-light mb-4">「当你静下来，才能看见更远的路」</p>
          <p className="text-[19px] leading-[1.75] text-slate-500 mb-8">每当迷茫时，回到这里，思考你的使命、愿景、价值观</p>
          <div className="h-px w-full bg-gradient-to-r from-blue-100/90 via-slate-200/80 to-transparent mb-10" />

          <div className="max-w-5xl">
              {mode === 'work' ? (
                <textarea
                  value={heroData.mission}
                  onChange={(e) => setOverrideHero((prev) => ({ ...prev, [client]: { mission: e.target.value, vision: heroData.vision, values: heroData.values } }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[52px] sm:text-[56px] leading-[1.14] tracking-[-0.03em] font-semibold text-slate-900 mb-10 bg-white"
                />
              ) : (
                <h2 className="text-[52px] sm:text-[56px] leading-[1.14] tracking-[-0.03em] font-semibold text-slate-900 mb-10">{heroData.mission}</h2>
              )}

              {mode === 'work' ? (
                <textarea
                  value={heroData.vision}
                  onChange={(e) => setOverrideHero((prev) => ({ ...prev, [client]: { mission: heroData.mission, vision: e.target.value, values: heroData.values } }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[40px] sm:text-[42px] leading-[1.25] tracking-[-0.02em] font-medium text-slate-700 mb-10 bg-white"
                />
              ) : (
                <p className="text-[40px] sm:text-[42px] leading-[1.25] tracking-[-0.02em] font-medium text-slate-700 mb-10">{heroData.vision}</p>
              )}

              {mode === 'work' ? (
                <textarea
                  value={heroData.values.join('\n')}
                  onChange={(e) => setOverrideHero((prev) => ({ ...prev, [client]: { mission: heroData.mission, vision: heroData.vision, values: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[14px] text-slate-700 min-h-[120px]"
                  placeholder="每行一个价值观，回车分隔"
                />
              ) : (
                <div className="flex flex-wrap gap-3 mb-2">
                  {heroData.values.map((v) => (
                    <span key={v} className="px-5 py-2.5 rounded-full border border-blue-100 bg-white/90 text-[16px] text-slate-700 shadow-[0_1px_6px_rgba(15,23,42,0.04)]">{v}</span>
                  ))}
                </div>
              )}
            </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader title="战略里程碑时间线（Strategic Timeline）" subtitle="" icon={<CalendarClock className="w-4 h-4" />} action={mode === 'work' ? <button onClick={addTimelineCard} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px]"><Plus className="w-3 h-3" />新增阶段</button> : undefined} />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {timelineData.map((t, index) => (
                <div key={`${t.stage}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 relative">
                  {mode === 'work' && (
                    <button onClick={() => removeTimelineCard(index)} className="absolute top-2 right-2 w-6 h-6 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100">−</button>
                  )}

                  {mode === 'work' ? (
                    <div className="space-y-2">
                      <input value={t.stage} onChange={(e) => updateTimelineField(index, 'stage', e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] font-semibold" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={t.date} onChange={(e) => updateTimelineField(index, 'date', e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px]" />
                        <select value={t.status} onChange={(e) => updateTimelineField(index, 'status', e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] bg-white">
                          <option value="done">done</option>
                          <option value="current">current</option>
                          <option value="pending">pending</option>
                        </select>
                      </div>
                      <textarea value={t.detail} onChange={(e) => updateTimelineField(index, 'detail', e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[90px]" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        {t.status === 'done' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                        {t.status === 'current' && <Clock3 className="w-4 h-4 text-amber-600" />}
                        {t.status === 'pending' && <AlertCircle className="w-4 h-4 text-slate-400" />}
                        <p className="text-[13px] font-semibold text-slate-800">{t.stage}</p>
                      </div>
                      <p className="text-[12px] text-slate-500 mb-2">{t.date}</p>
                      <p className="text-[13px] text-slate-700 leading-6">{t.detail}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader title="年度北极星与承诺（North Star & Commitments）" subtitle="年度北极星 + 年度交付 + 14天动作" icon={<LayoutGrid className="w-4 h-4" />} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 rounded-2xl bg-blue-50/60 border border-blue-100/80 p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-blue-500 mb-2">North Star</p>
                {mode === 'work' ? (
                  <>
                    <textarea value={northData.northStar} onChange={(e) => setOverrideNorth((prev) => ({ ...prev, [client]: { northStar: e.target.value, northStarMetrics: northData.northStarMetrics, annualDeliverables: northData.annualDeliverables, next14Days: northData.next14Days } }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[19px] leading-8 font-semibold text-slate-800 mb-3" />
                    <textarea value={northData.northStarMetrics.join('\n')} onChange={(e) => setOverrideNorth((prev) => ({ ...prev, [client]: { northStar: northData.northStar, northStarMetrics: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean), annualDeliverables: northData.annualDeliverables, next14Days: northData.next14Days } }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 min-h-[150px]" placeholder="每行一个北极星指标" />
                  </>
                ) : (
                  <>
                    <p className="text-[19px] leading-8 font-semibold text-slate-800 mb-4">{northData.northStar}</p>
                    <ul className="space-y-2 text-[13px] text-slate-700">
                      {northData.northStarMetrics.map((m) => <li key={m}>• {m}</li>)}
                    </ul>
                  </>
                )}
              </div>

              <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">年度关键动作</p>
                {mode === 'work' ? (
                  <textarea value={northData.next14Days.join('\n')} onChange={(e) => setOverrideNorth((prev) => ({ ...prev, [client]: { northStar: northData.northStar, northStarMetrics: northData.northStarMetrics, annualDeliverables: northData.annualDeliverables, next14Days: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 min-h-[240px]" placeholder="每行一个关键动作" />
                ) : (
                  <ul className="space-y-2 text-[13px] text-slate-700 leading-6">
                    {northData.next14Days.map((x) => <li key={x}>• {x}</li>)}
                  </ul>
                )}
              </div>

              <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">年度关键交付物</p>
                {mode === 'work' ? (
                  <textarea value={northData.annualDeliverables.join('\n')} onChange={(e) => setOverrideNorth((prev) => ({ ...prev, [client]: { northStar: northData.northStar, northStarMetrics: northData.northStarMetrics, annualDeliverables: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean), next14Days: northData.next14Days } }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 min-h-[240px]" placeholder="每行一个关键交付物" />
                ) : (
                  <ul className="space-y-2 text-[13px] text-slate-700 leading-6">
                    {northData.annualDeliverables.map((x) => <li key={x}>• {x}</li>)}
                  </ul>
                )}
              </div>
            </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader title="本季度重点目标（Quarter Focus Goals）" subtitle="本季度重点目标（高负载内容测试）" icon={<ClipboardList className="w-4 h-4" />} />

            <div className={`grid grid-cols-1 ${mode === 'work' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
              {goalCards.map((g, index) => (
                <div key={g.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-[12px] text-slate-500 mb-1">标题</p>
                  {mode === 'work' ? (
                    <input value={g.title} onChange={(e) => {
                      const current=[...goalCards]; current[index]={...current[index], title:e.target.value}; setOverrideGoals((prev)=>({ ...prev, [client]: current }));
                    }} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[14px] mb-2" />
                  ) : (
                    <p className="text-[15px] font-semibold text-slate-800 mb-2">{g.title}</p>
                  )}

                  <p className="text-[12px] text-slate-500 mb-1">简述</p>
                  {mode === 'work' ? (
                    <textarea value={g.oneLiner} onChange={(e) => {
                      const current=[...goalCards]; current[index]={...current[index], oneLiner:e.target.value}; setOverrideGoals((prev)=>({ ...prev, [client]: current }));
                    }} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[64px] mb-3" />
                  ) : (
                    <p className="text-[13px] text-slate-600 leading-6 mb-3">{g.oneLiner}</p>
                  )}

                  <p className="text-[12px] text-slate-500 mb-1">进度管理</p>
                  {mode === 'work' ? (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={g.progress}
                      onChange={(e) => updateGoalProgress(index, Number(e.target.value))}
                      className="w-full accent-blue-600 mb-2"
                    />
                  ) : (
                    <div className="h-2 rounded-full bg-slate-200 mb-2"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${g.progress}%` }} /></div>
                  )}
                  <p className="text-[12px] text-slate-500 mb-3">进度 {g.progress}%</p>

                  <p className="text-[12px] text-slate-500 mb-1">分解目标</p>
                  {mode === 'work' ? (
                    <textarea value={g.kpis.join('\n')} onChange={(e) => {
                      const current=[...goalCards]; current[index]={...current[index], kpis:e.target.value.split('\n').map((x)=>x.trim()).filter(Boolean)}; setOverrideGoals((prev)=>({ ...prev, [client]: current }));
                    }} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[84px] mb-3" />
                  ) : (
                    <div className="space-y-1.5 text-[13px] text-slate-700 mb-3">
                      {g.kpis.map((k) => <p key={k}>• {k}</p>)}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 text-[12px] text-amber-700 space-y-1.5">
                    {mode === 'work' ? (
                      <textarea value={g.risks.join('\n')} onChange={(e) => {
                        const current=[...goalCards]; current[index]={...current[index], risks:e.target.value.split('\n').map((x)=>x.trim()).filter(Boolean)}; setOverrideGoals((prev)=>({ ...prev, [client]: current }));
                      }} className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 text-[12px] min-h-[74px]" />
                    ) : (
                      g.risks.map((r) => <p key={r}>⚠ 可能遇到的问题：{r}</p>)
                    )}
                  </div>
                </div>
              ))}
            </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader title="近期事件（Recent Events）" subtitle="跨部门近期推进与战略陪伴价值呈现" icon={<MessageSquare className="w-4 h-4" />} />

            <div className="space-y-4">
              {recentData.map((m, index) => (
                <div key={`${m.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    {mode === 'work' ? (
                      <input
                        value={m.title}
                        onChange={(e) => updateRecentEvent(index, { title: e.target.value })}
                        className="flex-1 min-w-[260px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-[15px] font-semibold text-slate-800"
                      />
                    ) : (
                      <p className="text-[15px] font-semibold text-slate-800">{m.title}</p>
                    )}
                    {mode === 'work' ? (
                      <input
                        value={m.date}
                        onChange={(e) => updateRecentEvent(index, { date: e.target.value })}
                        className="w-[140px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] text-slate-500 text-right"
                      />
                    ) : (
                      <p className="text-[12px] text-slate-500">{m.date}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">近期事件简述</p>
                    {mode === 'work' ? (
                      <textarea
                        value={m.scope}
                        onChange={(e) => updateRecentEvent(index, { scope: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[72px]"
                      />
                    ) : (
                      <p className="text-[13px] text-slate-700 leading-6">{m.scope}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">近期事件目标</p>
                      {mode === 'work' ? (
                        <textarea
                          value={m.doneItems.join('\n')}
                          onChange={(e) => updateRecentEvent(index, { doneItems: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[120px]"
                        />
                      ) : (
                        <ul className="space-y-1.5 text-[13px] text-slate-700 leading-6">{m.doneItems.map((x) => <li key={x}>• {x}</li>)}</ul>
                      )}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">近期事件价值</p>
                      {mode === 'work' ? (
                        <textarea
                          value={m.valueItems.join('\n')}
                          onChange={(e) => updateRecentEvent(index, { valueItems: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[120px]"
                        />
                      ) : (
                        <ul className="space-y-1.5 text-[13px] text-slate-700 leading-6">{m.valueItems.map((x) => <li key={x}>• {x}</li>)}</ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader title="文档资源与会议记录（Resources & Records）" subtitle="文档与会议（真实高密内容）" icon={<Files className="w-4 h-4" />} />

          {mode === 'work' && (
            <div className="mb-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2">
                <p className="text-[12px] text-slate-500">新增文档（全局编辑）</p>
                <input value={quickDoc.title} onChange={(e)=>setQuickDoc((s)=>({...s,title:e.target.value}))} placeholder="标题" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
                <input value={quickDoc.desc} onChange={(e)=>setQuickDoc((s)=>({...s,desc:e.target.value}))} placeholder="简介" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
                <input value={quickDoc.link} onChange={(e)=>setQuickDoc((s)=>({...s,link:e.target.value}))} placeholder="链接" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
                <button onClick={()=>{ if(!quickDoc.title||!quickDoc.link) return; const next=[...docs, { title: quickDoc.title, date: new Date().toISOString().slice(0,10), desc: quickDoc.desc || '暂无描述', link: quickDoc.link }]; setOverrideDocs((prev)=>({ ...prev, [client]: next })); setQuickDoc({title:'',desc:'',link:''}); }} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[12px]">加入文档列表</button>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2">
                <p className="text-[12px] text-slate-500">新增会议（全局编辑）</p>
                <input value={quickMeeting.title} onChange={(e)=>setQuickMeeting((s)=>({...s,title:e.target.value}))} placeholder="会议标题" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
                <input value={quickMeeting.topic} onChange={(e)=>setQuickMeeting((s)=>({...s,topic:e.target.value}))} placeholder="核心议题" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
                <input value={quickMeeting.link} onChange={(e)=>setQuickMeeting((s)=>({...s,link:e.target.value}))} placeholder="链接" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
                <button onClick={()=>{ if(!quickMeeting.title||!quickMeeting.link) return; const next=[...meetings, { title: quickMeeting.title, date: new Date().toISOString().slice(0,10), duration: '90 分钟', attendees: '8 人', keyPeople: '待补充', topic: quickMeeting.topic || '待补充', link: quickMeeting.link }]; setOverrideMeetings((prev)=>({ ...prev, [client]: next })); setQuickMeeting({title:'',topic:'',link:''}); }} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[12px]">加入会议列表</button>
              </div>
            </div>
          )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">文档资源</p>
                <div className="space-y-3">
                  {docs.map((d, index) => (
                    <a key={`${d.title}-${index}`} href={d.link} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors relative">
                      {mode === 'work' && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); editDocItem(index); }} className="w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteDocItem(index); }} className="w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100">−</button>
                        </div>
                      )}
                      <p className="text-[14px] font-medium text-slate-800 mb-1">{d.title}（{d.date}）</p>
                      <p className="text-[13px] text-slate-700 leading-6">{d.desc}</p>
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">会议记录</p>
                <div className="space-y-3">
                  {meetings.map((m, index) => (
                    <a key={`${m.title}-${index}`} href={m.link} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors relative">
                      {mode === 'work' && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); editMeetingItem(index); }} className="w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteMeetingItem(index); }} className="w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100">−</button>
                        </div>
                      )}
                      <p className="text-[14px] font-medium text-slate-800 mb-1">{m.title}</p>
                      <p className="text-[12px] text-slate-500 mb-1.5">{m.date} · {m.duration} · {m.attendees}</p>
                      <p className="text-[13px] text-slate-700 mb-1.5 leading-6">主要参会人：{m.keyPeople}</p>
                      <p className="text-[13px] text-slate-700 leading-6">核心议题：{m.topic}</p>
                    </a>
                  ))}
                </div>
              </div>
            </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader title="赋能学习资源（Learning Academy）" subtitle="赋能资源（与目标联动）" icon={<GraduationCap className="w-4 h-4" />} />

          {mode === 'work' && (
            <div className="mb-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-2">
              <p className="text-[12px] text-slate-500">新增学习资源（全局编辑）</p>
              <input value={quickLearning.title} onChange={(e)=>setQuickLearning((s)=>({...s,title:e.target.value}))} placeholder="标题" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
              <input value={quickLearning.summary} onChange={(e)=>setQuickLearning((s)=>({...s,summary:e.target.value}))} placeholder="摘要" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
              <input value={quickLearning.relation} onChange={(e)=>setQuickLearning((s)=>({...s,relation:e.target.value}))} placeholder="关联目标" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
              <input value={quickLearning.link} onChange={(e)=>setQuickLearning((s)=>({...s,link:e.target.value}))} placeholder="链接" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
              <button onClick={()=>{ if(!quickLearning.title||!quickLearning.link) return; const kind=inferLearningKind(quickLearning.link); setExtraLearning((prev)=>({...prev,[client]: [...(prev[client]||[]), { title: quickLearning.title, summary: quickLearning.summary || '资源简介待补充', relation: quickLearning.relation || '关联目标：待补充', detail: ['链接已粘贴，可继续补充标签'], kind, link: quickLearning.link }] })); setQuickLearning({title:'',summary:'',relation:'',link:''}); }} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[12px]">加入学习资源</button>
            </div>
          )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {learning.map((l) => (
                <a key={l.title} href={l.link || 'https://open.feishu.cn/document'} target="_blank" rel="noreferrer" className="block rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 hover:border-indigo-200 hover:bg-indigo-50/70 transition-colors">
                  <p className="text-[12px] text-indigo-700 mb-1">{l.kind || '文章'}</p>
                  <p className="text-[15px] font-semibold text-slate-800 mb-2">{l.title}</p>
                  <p className="text-[13px] text-slate-700 leading-6 mb-2">{l.summary}</p>
                  <p className="text-[12px] text-indigo-700 mb-2">{l.relation}</p>
                  <ul className="text-[12px] text-slate-600 space-y-1.5 leading-6">
                    {l.detail.map((x) => <li key={x}>• {x}</li>)}
                  </ul>
                </a>
              ))}
            </div>
        </section>

      </main>

      {false && mode === 'work' && drawerType && (
        <div className="fixed inset-0 z-50 bg-black/25">
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-slate-900">
                {drawerType === 'hero' && '编辑：方向画布文案'}
                {drawerType === 'doc' && '新增文档资源'}
                {drawerType === 'meeting' && '新增会议记录'}
                {drawerType === 'learning' && '新增赋能资源'}
                {drawerType === 'north' && '编辑：年度北极星与承诺'}
                {drawerType === 'timeline' && '编辑：战略里程碑时间线'}
                {drawerType === 'goal' && '编辑：本季度重点目标'}
                {drawerType === 'recent' && '编辑：近期事件'}
              </h3>
              <button onClick={() => setDrawerType(null)} className="text-sm text-slate-500">关闭</button>
            </div>

            <div className="space-y-3">
              {drawerType === 'hero' && (
                <>
                  <textarea value={form.missionText} onChange={(e) => setForm((f) => ({ ...f, missionText: e.target.value }))} placeholder="使命（Mission）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[88px]" />
                  <textarea value={form.visionText} onChange={(e) => setForm((f) => ({ ...f, visionText: e.target.value }))} placeholder="愿景（Vision）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[88px]" />
                  <textarea value={form.valuesText} onChange={(e) => setForm((f) => ({ ...f, valuesText: e.target.value }))} placeholder="价值观（每行一条）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[120px]" />
                </>
              )}

              {(drawerType === 'doc' || drawerType === 'meeting' || drawerType === 'learning') && (
                <>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="标题 / 主题" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
                  <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="飞书链接 / 文章链接" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
                  <textarea value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} placeholder={drawerType === 'meeting' ? '可选：补充说明' : '简介（1-2句）'} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[88px]" />
                </>
              )}

              {(drawerType === 'doc' || drawerType === 'meeting') && (
                <input value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} placeholder="日期（YYYY-MM-DD）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
              )}

              {drawerType === 'meeting' && (
                <>
                  <input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="会议时长（如 90 分钟）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
                  <input value={form.attendees} onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))} placeholder="参会人数（如 8 人）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
                  <input value={form.keyPeople} onChange={(e) => setForm((f) => ({ ...f, keyPeople: e.target.value }))} placeholder="主要参会人（逗号分隔）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
                  <input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="核心议题" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
                </>
              )}

              {drawerType === 'learning' && (
                <input value={form.relation} onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))} placeholder="关联目标（例如：关联目标：学校协作机制稳定化）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
              )}

              {drawerType === 'north' && (
                <>
                  <textarea value={form.northStar} onChange={(e) => setForm((f) => ({ ...f, northStar: e.target.value }))} placeholder="北极星一句话" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[72px]" />
                  <textarea value={form.metricsText} onChange={(e) => setForm((f) => ({ ...f, metricsText: e.target.value }))} placeholder="北极星指标（每行一条）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[96px]" />
                  <textarea value={form.deliverablesText} onChange={(e) => setForm((f) => ({ ...f, deliverablesText: e.target.value }))} placeholder="年度关键交付物（每行一条）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[110px]" />
                  <textarea value={form.nextText} onChange={(e) => setForm((f) => ({ ...f, nextText: e.target.value }))} placeholder="未来14天关键动作（每行一条）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[110px]" />
                </>
              )}

              {drawerType === 'timeline' && (
                <>
                  <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                    <p className="text-[12px] text-slate-500">新增里程碑</p>
                    <input value={form.timelineStage} onChange={(e) => setForm((f) => ({ ...f, timelineStage: e.target.value }))} placeholder="里程碑名称（如：战略共创）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
                    <input value={form.timelineDate} onChange={(e) => setForm((f) => ({ ...f, timelineDate: e.target.value }))} placeholder="日期（如：2024年6月）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
                    <select value={form.timelineStatus} onChange={(e) => setForm((f) => ({ ...f, timelineStatus: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] bg-white">
                      <option value="done">已完成</option>
                      <option value="current">进行中</option>
                      <option value="pending">待执行</option>
                    </select>
                    <textarea value={form.timelineDetail} onChange={(e) => setForm((f) => ({ ...f, timelineDetail: e.target.value }))} placeholder="关键内容（阶段说明）" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[88px]" />
                    <button onClick={addTimelineItem} className="px-3 py-2 rounded-lg border border-slate-200 text-[13px] bg-white">+ 增加一个战略里程碑</button>
                  </div>
                  <textarea value={form.timelineText} onChange={(e) => setForm((f) => ({ ...f, timelineText: e.target.value }))} placeholder="每行：阶段|日期|状态(done/current/pending)|说明" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[220px]" />
                </>
              )}

              {drawerType === 'goal' && (
                <textarea value={form.goalsText} onChange={(e) => setForm((f) => ({ ...f, goalsText: e.target.value }))} placeholder="每行：标题|一句说明|进度(0-100)|KPI1；KPI2|风险1；风险2" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[240px]" />
              )}

              {drawerType === 'recent' && (
                <textarea value={form.recentText} onChange={(e) => setForm((f) => ({ ...f, recentText: e.target.value }))} placeholder="每行：事件标题|日期|时长|参与对象|覆盖范围|本次完成事项(；分隔)|战略价值(；分隔)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] min-h-[240px]" />
              )}

            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setDrawerType(null)} className="px-3 py-2 rounded-lg border border-slate-200 text-[13px]">取消</button>
              <button onClick={submitDrawer} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[13px]">{drawerType === 'hero' || drawerType === 'north' || drawerType === 'timeline' || drawerType === 'goal' || drawerType === 'recent' ? '保存更新' : '保存并生成卡片'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
