export type ParticipationRole =
  | 'nonprofit'
  | 'social_enterprise'
  | 'sme'
  | 'funder'
  | 'frontline_operator'
  | 'beginner_volunteer'
  | 'developer'
  | 'product_volunteer'
  | 'designer'
  | 'tester'
  | 'writer'
  | 'implementer'
  | 'maintainer';

export type RoleParticipationPath = {
  id: ParticipationRole;
  label: string;
  headline: string;
  motivation: string;
  currentBarrier: string;
  fastestPath: string[];
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  relatedTags: string[];
};

export const ROLE_PARTICIPATION_PATHS: RoleParticipationPath[] = [
  {
    id: 'nonprofit',
    label: '公益组织',
    headline: '告诉我们哪件事最消耗你们',
    motivation: '减少活动、志愿者、项目月报中的重复整理，把时间还给服务本身。',
    currentBarrier: '组织不知道怎么把业务痛点翻译成技术需求，担心提了也没人跟。',
    fastestPath: ['选择最耗时场景', '描述当前做法与痛点', '提交组织场景并进入共建议题池'],
    primaryAction: {
      label: '提交公益组织场景',
      href: '?page=demand-submit&role=nonprofit&scene=志愿者管理',
    },
    secondaryAction: {
      label: '查看公益相关议题',
      href: '?page=demand-pool&role=nonprofit',
    },
    relatedTags: ['志愿者', '活动管理', '项目月报', '痕迹管理'],
  },
  {
    id: 'social_enterprise',
    label: '社会企业',
    headline: '把经营数据和社会价值放在同一个底座里',
    motivation: '兼顾客户经营、项目交付与社会影响力表达，避免两套系统重复维护。',
    currentBarrier: '商业指标和影响力指标分散，难以在同一流程里追踪。',
    fastestPath: ['选择经营+影响力场景', '补充数据来源与期望输出', '提交社会企业场景'],
    primaryAction: {
      label: '提交社会企业场景',
      href: '?page=demand-submit&role=social_enterprise&scene=项目管理',
    },
    secondaryAction: {
      label: '查看影响力议题',
      href: '?page=demand-pool&role=social_enterprise',
    },
    relatedTags: ['客户', '项目交付', '影响力报表'],
  },
  {
    id: 'sme',
    label: '中小企业',
    headline: '先把协作成本降下来，再扩展更多能力',
    motivation: '减少追进度、漏节点、重复录入，让小团队更稳地运转。',
    currentBarrier: '客户、合同、审批、库存分散在多个工具，交接和复盘成本高。',
    fastestPath: ['选择最卡业务流程', '提交企业协作场景', '查看可复用样板间'],
    primaryAction: {
      label: '提交企业协作场景',
      href: '?page=demand-submit&role=sme&scene=合同管理',
    },
    secondaryAction: {
      label: '查看企业样板议题',
      href: '?page=demand-pool&role=sme',
    },
    relatedTags: ['客户关系', '合同提醒', '流程模板'],
  },
  {
    id: 'funder',
    label: '资助方/合作方',
    headline: '支持公共工具，比支持一次性补材料更有效',
    motivation: '让组织把时间投入服务与行动，而不是月底拼报表和找素材。',
    currentBarrier: '很难看到哪些数字化能力能被一批组织复用并持续迭代。',
    fastestPath: ['查看高复用议题', '选择要支持的方向', '发起专项共建议题'],
    primaryAction: {
      label: '查看高复用议题',
      href: '?page=demand-pool&role=funder&value=open_source',
    },
    secondaryAction: {
      label: '提交支持场景',
      href: '?page=demand-submit&role=funder&scene=数据报告',
    },
    relatedTags: ['社会资源效率', '项目汇报', '可复用工具'],
  },
  {
    id: 'frontline_operator',
    label: '一线执行人员',
    headline: '把你每天最重复的那一步先提出来',
    motivation: '减少翻聊天记录、补表格、找素材，让执行者少被流程拖住。',
    currentBarrier: '痛点真实但表达困难，不知道如何写成可被开发的需求。',
    fastestPath: ['描述最重复动作', '标出耗时与影响角色', '提交组织场景'],
    primaryAction: {
      label: '提交重复整理场景',
      href: '?page=demand-submit&role=frontline_operator&scene=服务',
    },
    secondaryAction: {
      label: '看类似执行议题',
      href: '?page=demand-pool&role=frontline_operator',
    },
    relatedTags: ['重复整理', '项目执行', '协作效率'],
  },
  {
    id: 'beginner_volunteer',
    label: '新手志愿者',
    headline: '从 1 小时任务开始也有价值',
    motivation: '不写代码也能帮助真实组织，先从小任务建立参与信心。',
    currentBarrier: '担心任务太难、边界不清，报名后不知道从哪里开始。',
    fastestPath: ['选择 1 小时任务', '进入新手友好议题', '认领一个小任务'],
    primaryAction: {
      label: '查看 1 小时任务',
      href: '?page=demand-pool&role=beginner_volunteer&effort=1_hour',
    },
    secondaryAction: {
      label: '报名参与共建',
      href: '?page=volunteer-apply&role=beginner_volunteer',
    },
    relatedTags: ['新手友好', '测试反馈', '文档补充'],
  },
  {
    id: 'developer',
    label: '开发者',
    headline: '找到边界清楚、可直接开工的任务',
    motivation: '把真实组织问题做成可复用能力，而不是一次性功能。',
    currentBarrier: '任务边界、验收标准、上下游依赖不清会降低贡献效率。',
    fastestPath: ['按角色和难度筛选议题', '查看详情与验收标准', '去 Issue 认领'],
    primaryAction: {
      label: '查看开发任务',
      href: '?page=demand-pool&role=developer',
    },
    secondaryAction: {
      label: '查看贡献指南',
      href: 'https://github.com/guyuan9300/yiyu-thinktank-workbench',
    },
    relatedTags: ['前端', '后端', 'Issue', 'PR'],
  },
  {
    id: 'product_volunteer',
    label: '产品志愿者',
    headline: '把模糊问题整理成可协作的共建议题',
    motivation: '你能把组织语境转成可落地任务，是共建闭环的关键角色。',
    currentBarrier: '缺少统一的访谈模板、需求拆分模板和验收模板。',
    fastestPath: ['筛选待整理议题', '补齐场景与数据对象', '输出任务拆分与验收标准'],
    primaryAction: {
      label: '查看待整理议题',
      href: '?page=demand-pool&role=product_volunteer',
    },
    secondaryAction: {
      label: '成为产品志愿者',
      href: '?page=volunteer-apply&role=product_volunteer',
    },
    relatedTags: ['访谈', '需求拆分', '验收标准'],
  },
  {
    id: 'designer',
    label: '设计师',
    headline: '让真实组织更容易看懂和用起来',
    motivation: '通过界面和信息架构优化，降低组织上手成本。',
    currentBarrier: '设计任务入口不清晰，常常不知道当前最需要优化哪里。',
    fastestPath: ['筛选需要设计任务', '查看目标角色与输出要求', '提交设计方案'],
    primaryAction: {
      label: '查看设计任务',
      href: '?page=demand-pool&role=designer',
    },
    secondaryAction: {
      label: '报名设计志愿者',
      href: '?page=volunteer-apply&role=designer',
    },
    relatedTags: ['表单体验', '移动端', '信息架构'],
  },
  {
    id: 'tester',
    label: '测试志愿者',
    headline: '帮真实组织验证：这个功能到底有没有用',
    motivation: '测试不只是找 bug，更是把功能拉回真实使用场景。',
    currentBarrier: '缺少明确测试目标与反馈入口，容易不知道从哪里下手。',
    fastestPath: ['筛选测试中议题', '按验收标准执行', '提交反馈并推动迭代'],
    primaryAction: {
      label: '查看测试中议题',
      href: '?page=demand-pool&role=tester',
    },
    secondaryAction: {
      label: '加入测试志愿者',
      href: '?page=volunteer-apply&role=tester',
    },
    relatedTags: ['验收测试', '场景验证', '反馈闭环'],
  },
  {
    id: 'writer',
    label: '文档志愿者',
    headline: '把复杂工具写成普通组织能执行的说明',
    motivation: '文档直接决定组织能不能低成本上手和持续使用。',
    currentBarrier: '文档任务常被低估，缺少明确缺口清单。',
    fastestPath: ['筛选文档任务', '选择目标读者和模板', '提交可复用说明'],
    primaryAction: {
      label: '查看文档任务',
      href: '?page=demand-pool&role=writer',
    },
    secondaryAction: {
      label: '成为文档志愿者',
      href: '?page=volunteer-apply&role=writer',
    },
    relatedTags: ['使用手册', '贡献指南', '案例沉淀'],
  },
  {
    id: 'implementer',
    label: '实施志愿者',
    headline: '把共建成果真正带进组织日常',
    motivation: '部署、配置、试用、培训是把功能变成价值的关键一步。',
    currentBarrier: '实施任务入口分散，缺少可直接认领的试用支持任务。',
    fastestPath: ['筛选部署/试用任务', '选择可投入时段', '输出试用反馈'],
    primaryAction: {
      label: '查看实施支持任务',
      href: '?page=demand-pool&role=implementer',
    },
    secondaryAction: {
      label: '报名实施志愿者',
      href: '?page=volunteer-apply&role=implementer',
    },
    relatedTags: ['部署', '培训', '试用反馈'],
  },
  {
    id: 'maintainer',
    label: '维护者',
    headline: '让共建机制持续运转，而不是一次性热闹',
    motivation: '维护者保证状态更新、任务拆分、协作节奏和质量闭环。',
    currentBarrier: '需要在有限时间内平衡需求质量、志愿者体验和项目方向。',
    fastestPath: ['更新议题状态', '标记下一步动作与缺口角色', '同步 Issue/PR 进展'],
    primaryAction: {
      label: '查看待推进议题',
      href: '?page=demand-pool&role=maintainer',
    },
    secondaryAction: {
      label: '查看开源说明',
      href: 'https://github.com/guyuan9300/yiyu-thinktank-workbench',
    },
    relatedTags: ['状态流转', '任务拆分', '质量把关'],
  },
];

export const ROLE_PARTICIPATION_MAP = Object.fromEntries(
  ROLE_PARTICIPATION_PATHS.map((item) => [item.id, item]),
) as Record<ParticipationRole, RoleParticipationPath>;

export const ROLE_ENTRY_ORDER: ParticipationRole[] = [
  'nonprofit',
  'social_enterprise',
  'sme',
  'beginner_volunteer',
  'developer',
  'product_volunteer',
  'designer',
  'tester',
  'writer',
  'implementer',
  'funder',
  'frontline_operator',
  'maintainer',
];
