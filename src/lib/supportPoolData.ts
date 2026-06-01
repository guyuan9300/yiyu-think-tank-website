import { useEffect, useState } from 'react';
import type { Bilingual } from './i18n';

// ============================================================
// 行动者支持池 · 共享数据层 (本地 localStorage 桥)
// ------------------------------------------------------------
// 前台(首页 Ledger 卡 + 支持池抽屉)与后台(行动者支持池管理)
// 共用这一份数据。后台 save 写 localStorage，前台 useSupportPool()
// 实时读取(同标签页靠 CustomEvent，跨标签页靠原生 storage 事件)。
//
// ⚠️ 现在是 localStorage 本地桥，只在当前浏览器生效。
//    晚点接 cloud_backend 时，只需把 load/save 换成云端读写接口，
//    前后台组件不用改。
// ============================================================

export interface ProjectStat {
  primary?: string;
  label: Bilingual;
}

export interface Project {
  title: Bilingual;
  amount: number; // 万元 (默认), 可被 unit 覆盖
  budgetLabel: Bilingual;
  description: Bilingual;
  problem: Bilingual;
  stats: ProjectStat[];
  progress: number; // 0–100
  amountLabel?: Bilingual; // 右上角小标, 默认"已支持"
  unit?: Bilingual; // 金额单位, 默认"万元"
  href?: string; // 有则卡片可点击进详情页(?page=...)
}

export interface PoolStats {
  balance: number; // 池子余额 (万元)
  thisMonth: number; // 本月已支持 (万元)
  cumulative: number; // 累计支持 (万元)
  remainingPct: number; // 剩余额度 (%) — 首页卡片用
}

export interface SupportPoolData {
  stats: PoolStats;
  projects: Project[];
}

export const DEFAULT_SUPPORT_POOL: SupportPoolData = {
  stats: { balance: 52.68, thisMonth: 17.32, cumulative: 25.81, remainingPct: 75 },
  projects: [
    {
      title: { zh: '独角兽战略陪伴项目', en: 'Unicorn Strategy Companion Program' },
      amount: 50,
      amountLabel: { zh: '最高配比', en: 'Max match' },
      unit: { zh: '%', en: '%' },
      budgetLabel: { zh: '三年战略陪伴 · 首批招募中', en: 'Three-year companionship · first cohort recruiting' },
      description: {
        zh: '为每个公益领域中最有探索力的基金会、公益组织和社会企业提供三年战略陪伴，帮助它们看清问题变化、设计服务模式、沉淀方法论，并把一个组织的探索变成一个领域可以学习的经验。',
        en: 'Three years of strategic companionship for the most exploratory foundations, nonprofits, and social enterprises in each field — helping them read shifting problems, design service models, codify methods, and turn one organization’s exploration into lessons a whole field can learn from.',
      },
      problem: {
        zh: '公益最可惜的，不是项目做得少，而是很多好经验只停留在一次执行里。这个项目支持优秀组织从“把项目做好”，走向“把模式做出来”。',
        en: 'The real waste in social good isn’t too few projects — it’s good experience that never leaves a single execution. This program moves strong organizations from “running a project well” to “building a replicable model.”',
      },
      stats: [
        { primary: '3', label: { zh: '年陪伴周期', en: 'year cycle' } },
        { primary: '50%', label: { zh: '最高配比支持', en: 'max match support' } },
        { label: { zh: '面向领域标杆组织', en: 'For field-leading organizations' } },
      ],
      progress: 0,
      href: '?page=unicorn-companion',
    },
    {
      title: { zh: '数字化战略工作坊', en: 'Digital Strategy Workshop' },
      amount: 2,
      amountLabel: { zh: '为期', en: 'Lasts' },
      unit: { zh: '天', en: 'days' },
      budgetLabel: { zh: '地方枢纽共办 · 开放申请', en: 'Co-hosted with local hubs · open for applications' },
      description: {
        zh: '面向地区枢纽组织、平台型机构和行动者社群开展 2 天数字化战略工作坊，帮助公益组织、社会企业和行动者重新梳理问题、业务、资料和协作流程，并学习如何把 AI 从“问答工具”转化为真实工作流。',
        en: 'A two-day digital strategy workshop for regional hubs, platform organizations, and practitioner communities — helping nonprofits, social enterprises, and practitioners restructure their problems, operations, materials, and collaboration, and turn AI from a “Q&A tool” into a real workflow.',
      },
      problem: {
        zh: '很多行动者有专业经验，却常常被四件事卡住：问题停留在现象层、组织经营缺方法、资料沉淀在个人脑子里、AI 只停留在聊天问答。这个工作坊支持他们把经验变成结构，把资料变成资产，把行动变成可持续推进的工作流。',
        en: 'Many practitioners have expertise but get stuck on four things: problems stay at the surface, organizations lack operating methods, knowledge lives only in someone’s head, and AI never leaves the chat box. This workshop turns experience into structure, materials into assets, and action into a sustainable workflow.',
      },
      stats: [
        { primary: '2', label: { zh: '天工作坊', en: 'day workshop' } },
        { label: { zh: '地方枢纽共办', en: 'Co-hosted with local hubs' } },
        { label: { zh: '益语支持导师与费用', en: 'Yiyu covers mentors and costs' } },
      ],
      progress: 0,
      href: '?page=digital-workshop',
    },
    {
      title: { zh: '智能平台公益组织支持计划', en: 'Smart Platform · Nonprofit Support Program' },
      amount: 68,
      amountLabel: { zh: '已开通', en: 'Onboarded' },
      unit: { zh: '家组织', en: 'orgs' },
      budgetLabel: { zh: '平台开源免费 · 提供使用辅导', en: 'Open-source & free · with coaching' },
      description: {
        zh: '益语智库智能平台是一个开源 AI 工作系统，把组织管理、项目推进、资料沉淀、智能写作、事件线、复盘和 AI 同事能力整合到同一个工作台。我们面向民政注册公益慈善组织提供免费使用辅导，帮助组织完成平台配置、资料导入、模型接入和业务工作流设计。',
        en: 'The Yiyu smart platform is an open-source AI work system bringing org management, project execution, knowledge capture, smart writing, event timelines, retrospectives, and AI-coworker abilities into one workbench. We offer free coaching to registered nonprofits for platform setup, data import, model integration, and workflow design.',
      },
      problem: {
        zh: '很多公益组织不是不想用 AI，而是不知道怎么把 AI 接进真实工作：资料散在文件夹和微信群里，会议记录没有沉淀，项目报告反复重写，AI 问答每次都要重新解释背景。这个项目帮助公益组织把过去的资料、项目和经验整理成组织可以持续调用的数字资产。',
        en: 'Many nonprofits do want AI but don’t know how to wire it into real work: materials scattered across folders and chat groups, meeting notes never captured, reports rewritten over and over, and every AI question needing the background re-explained. This program turns past materials, projects, and experience into digital assets the organization can keep drawing on.',
      },
      stats: [
        { label: { zh: '平台开源免费', en: 'Open-source & free' } },
        { label: { zh: '面向民政注册公益组织', en: 'For registered nonprofits' } },
        { label: { zh: '提供配置与使用辅导', en: 'Setup & usage coaching' } },
      ],
      progress: 0,
      href: '?page=platform-support',
    },
    {
      title: { zh: '"小镇图书室"项目(3 个县镇)', en: '“Small-Town Library” Project (3 county towns)' },
      amount: 2.8,
      budgetLabel: { zh: '本年度预算 6.00 万元', en: 'This year’s budget: 60k CNY' },
      description: {
        zh: '在 3 个县级镇与本地行动者共同建立社区图书室，由本地志愿者团队日常运营，平台负责书目供给、培训和阶段补助。',
        en: 'Building community libraries with local practitioners in three county towns, run day-to-day by local volunteer teams, with the platform supplying books, training, and phased subsidies.',
      },
      problem: {
        zh: '县城及以下的孩子放学后没有稳定、有人陪伴的阅读空间。商业书店覆盖不到，学校图书室节假日不开。本地行动者愿意做，但需要稳定的启动资金和持续支持。',
        en: 'Kids in county towns and below have no stable, supervised place to read after school. Bookstores don’t reach them and school libraries close on holidays. Local practitioners are willing, but need steady startup funds and ongoing support.',
      },
      stats: [
        { primary: '3', label: { zh: '个镇已落地', en: 'towns live' } },
        { primary: '612', label: { zh: '名儿童服务', en: 'children served' } },
        { label: { zh: '2024-09 起 · 持续', en: 'Since 2024-09 · ongoing' } },
      ],
      progress: 47,
    },
    {
      title: { zh: '乡村美育志愿者驻校支持', en: 'Rural Arts-Education Volunteer Residency' },
      amount: 1.45,
      budgetLabel: { zh: '本学期预算 3.20 万元', en: 'This term’s budget: 32k CNY' },
      description: {
        zh: '为 4 所乡村小学补齐美术、音乐、戏剧课程。志愿者老师以"驻校两周 + 远程陪伴"的方式与本校老师协作，所有课件开源沉淀给学校。',
        en: 'Filling the art, music, and drama gap at four rural primary schools. Volunteer teachers work with on-staff teachers via “two-week residency + remote support,” with all materials open-sourced and left with the schools.',
      },
      problem: {
        zh: '乡村学校长期缺乏美育课，孩子的表达通道窄。派几次大课留不下东西，完全靠学校自有师资又不现实。这个项目让外部志愿者和本校老师共建课程，让东西真正留在学校。',
        en: 'Rural schools have long lacked arts education, leaving children few outlets for expression. One-off lectures leave nothing behind, and relying on in-house staff alone isn’t realistic. This project has outside volunteers and local teachers co-build curriculum that actually stays at the school.',
      },
      stats: [
        { primary: '4', label: { zh: '所合作学校', en: 'partner schools' } },
        { primary: '420', label: { zh: '名学生覆盖', en: 'students reached' } },
        { label: { zh: '学期制 · 2025 春', en: 'Per term · Spring 2025' } },
      ],
      progress: 45,
    },
    {
      title: { zh: '本地心理支持热线运营', en: 'Local Mental-Health Support Hotline' },
      amount: 2.86,
      budgetLabel: { zh: '季度预算 4.50 万元', en: 'Quarterly budget: 45k CNY' },
      description: {
        zh: '由 12 位经过专业培训的本地志愿者轮班，每周 5 天接听来电，主要服务弱势人群与处于急性情绪困境的来电者。',
        en: 'Twelve professionally trained local volunteers work in shifts, taking calls five days a week — mainly serving vulnerable people and callers in acute emotional distress.',
      },
      problem: {
        zh: '全国性热线常占线，弱势人群更难打通。"小而稳"的本地热线能补上这一段，但运营成本(话务、督导、志愿者补贴)是真实的、长期的——它需要一个稳定的小池子托着。',
        en: 'National hotlines are often busy, and vulnerable people struggle most to get through. A “small but steady” local line fills that gap, but its running costs — telephony, supervision, volunteer stipends — are real and ongoing, and need a stable pool behind them.',
      },
      stats: [
        { primary: '12', label: { zh: '位值守志愿者', en: 'volunteers on duty' } },
        { primary: '384', label: { zh: '次本月接听', en: 'calls this month' } },
        { label: { zh: '2024-03 起 · 持续', en: 'Since 2024-03 · ongoing' } },
      ],
      progress: 64,
    },
  ],
};

const KEY = 'yiyu_support_pool_v1';
export const SUPPORT_POOL_EVENT = 'yiyu:support-pool-changed';

export function loadSupportPool(): SupportPoolData {
  if (typeof localStorage === 'undefined') return DEFAULT_SUPPORT_POOL;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SUPPORT_POOL;
    const parsed = JSON.parse(raw) as Partial<SupportPoolData>;
    return {
      stats: { ...DEFAULT_SUPPORT_POOL.stats, ...(parsed.stats ?? {}) },
      projects: Array.isArray(parsed.projects) && parsed.projects.length > 0
        ? (parsed.projects as Project[])
        : DEFAULT_SUPPORT_POOL.projects,
    };
  } catch {
    return DEFAULT_SUPPORT_POOL;
  }
}

export function saveSupportPool(data: SupportPoolData): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(data));
  // 同标签页内通知(后台与前台同页预览); 跨标签页靠原生 storage 事件
  window.dispatchEvent(new CustomEvent(SUPPORT_POOL_EVENT));
}

export function resetSupportPool(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(SUPPORT_POOL_EVENT));
}

// 前台组件用: 实时跟随后台改动 (同页 CustomEvent + 跨标签页 storage)
export function useSupportPool(): SupportPoolData {
  const [data, setData] = useState<SupportPoolData>(loadSupportPool);
  useEffect(() => {
    const reload = (): void => setData(loadSupportPool());
    window.addEventListener(SUPPORT_POOL_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(SUPPORT_POOL_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  return data;
}
