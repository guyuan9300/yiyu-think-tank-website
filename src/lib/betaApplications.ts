import { useEffect, useState } from 'react';

// ============================================================
// 益语智库 AI · 内测申请(第一期: 独立字段 + 本地 localStorage 桥)
// 申请须先登录 → 记录挂在用户(email)上; 后台审核后「发放内测码」。
// ⚠️ 本地桥, 仅当前浏览器有效; 第二期接 cloud_backend 用户表 + 邮件发码。
// ============================================================

export type BetaUserType = 'nonprofit' | 'enterprise' | 'individual';

export const BETA_USER_TYPE_LABEL: Record<BetaUserType, string> = {
  nonprofit: '公益慈善组织',
  enterprise: '企业用户',
  individual: '个人用户',
};

export interface BetaApplication {
  id: string;
  userName: string;
  userEmail: string;
  userType: BetaUserType;
  orgName?: string;   // 企业 / 公益: 机构名称
  purpose?: string;   // 个人: 用途(开放填写)
  status: 'pending' | 'approved';
  code?: string;      // 审核通过后发放的内测码
  sentAt?: string;    // 邀请码邮件发送时间(第一期本地标记; 第二期由 SMTP 回填真实发送时间)
  createdAt: string;
  updatedAt: string;
}

const KEY = 'yiyu_beta_applications_v1';
export const BETA_APPS_EVENT = 'yiyu:beta-apps-changed';

function nowISO(): string { return new Date().toISOString(); }

// 内置示例申请(演示用): 后台默认可见, 覆盖公益/企业/个人 + 待审核/已发码。
// localStorage 里有同 id 不再补; 真实申请进来与之并列。
const SEED_BETA_APPLICATIONS: BetaApplication[] = [
  { id: 'beta-demo-1', userName: '李晓', userEmail: 'lixiao@sunshine-foundation.org', userType: 'nonprofit', orgName: '阳光助学公益基金会', status: 'pending', createdAt: '2026-05-30T09:12:00.000Z', updatedAt: '2026-05-30T09:12:00.000Z' },
  { id: 'beta-demo-2', userName: '王经理', userEmail: 'wang@bluesea-tech.com', userType: 'enterprise', orgName: '蓝海科技有限公司', status: 'pending', createdAt: '2026-05-30T14:36:00.000Z', updatedAt: '2026-05-30T14:36:00.000Z' },
  { id: 'beta-demo-3', userName: '张明', userEmail: 'zhangming@gmail.com', userType: 'individual', purpose: '想用它来整理我做乡村教育志愿项目的资料和写结项报告，最好能让 AI 读我的会议记录帮我归纳。', status: 'approved', code: 'YIYU-DEMO01', createdAt: '2026-05-29T20:05:00.000Z', updatedAt: '2026-05-30T08:00:00.000Z' },
];

export function loadBetaApplications(): BetaApplication[] {
  if (typeof localStorage === 'undefined') return SEED_BETA_APPLICATIONS;
  try {
    const raw = localStorage.getItem(KEY);
    const stored = raw ? (JSON.parse(raw) as BetaApplication[]) : [];
    const have = new Set(stored.map((a) => a.id));
    const missing = SEED_BETA_APPLICATIONS.filter((s) => !have.has(s.id));
    return missing.length ? [...stored, ...missing] : stored;
  } catch { return SEED_BETA_APPLICATIONS; }
}

function persist(list: BetaApplication[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(BETA_APPS_EVENT));
}

/** 新增/更新申请(同一 email 覆盖其 pending 申请, 保留已审核的) */
export function submitBetaApplication(input: Omit<BetaApplication, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'code'>): BetaApplication {
  const list = loadBetaApplications();
  const existing = list.find((a) => a.userEmail.toLowerCase() === input.userEmail.toLowerCase());
  if (existing) {
    Object.assign(existing, input, { updatedAt: nowISO() });
    persist(list);
    return existing;
  }
  const app: BetaApplication = { ...input, id: `beta_${Date.now()}`, status: 'pending', createdAt: nowISO(), updatedAt: nowISO() };
  list.unshift(app);
  persist(list);
  return app;
}

export function generateBetaCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `YIYU-${rand}`;
}

/** 后台发放内测码(审核通过) */
export function grantBetaCode(id: string, code?: string): BetaApplication | null {
  const list = loadBetaApplications();
  const app = list.find((a) => a.id === id);
  if (!app) return null;
  app.code = code || app.code || generateBetaCode();
  app.status = 'approved';
  app.updatedAt = nowISO();
  persist(list);
  return app;
}

export function deleteBetaApplication(id: string): void {
  persist(loadBetaApplications().filter((a) => a.id !== id));
}

/**
 * 一键发送邀请码邮件(无弹窗): 确保已发码 → 标记已发送。
 * ⚠️ 第一期仅本地标记(不真实投递); 第二期接 cloud_backend SMTP 后此函数改为真发并回填 sentAt。
 */
export function markBetaInviteSent(id: string): BetaApplication | null {
  const list = loadBetaApplications();
  const app = list.find((a) => a.id === id);
  if (!app) return null;
  app.code = app.code || generateBetaCode();
  app.status = 'approved';
  app.sentAt = nowISO();
  app.updatedAt = nowISO();
  persist(list);
  return app;
}

// ============================================================
// 邀请码邮件(第一期: mailto 拉起本机邮件客户端预填; 第二期接 cloud_backend SMTP 自动发)
// ============================================================

/** 生成发给申请人的邀请码邮件正文(纯文本) */
export function buildBetaInviteEmail(app: BetaApplication): { subject: string; body: string } {
  const code = app.code || '(尚未生成, 请先发放内测码)';
  const subject = '【益语智库 AI】您的内测邀请码';
  const body = [
    `${app.userName} 您好，`,
    '',
    '感谢申请益语智库 AI 内测。您的专属内测邀请码为：',
    '',
    `    ${code}`,
    '',
    '使用方式：',
    '1. 打开益语智库官网 →「益语智库 AI」页面 → 点击「下载 macOS 版」。',
    '2. 选择「输入内测码下载」，填入上方邀请码即可下载安装。',
    '3. 首次使用需配置模型与云端账号；如遇问题，可直接回复本邮件。',
    '',
    '益语智库团队',
  ].join('\n');
  return { subject, body };
}

/** 构造该申请人的 mailto 链接(已 URL 编码) */
export function buildBetaInviteMailto(app: BetaApplication): string {
  const { subject, body } = buildBetaInviteEmail(app);
  const to = encodeURIComponent(app.userEmail || '');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** 校验下载内测码: 是否匹配任一"已审核通过"申请的码 */
export function isApprovedBetaCode(code: string): boolean {
  const c = code.trim().toUpperCase();
  return loadBetaApplications().some((a) => a.status === 'approved' && a.code && a.code.toUpperCase() === c);
}

/** 当前用户(email)是否已有申请 / 已批的码 */
export function getBetaApplicationByEmail(email: string): BetaApplication | null {
  if (!email) return null;
  return loadBetaApplications().find((a) => a.userEmail.toLowerCase() === email.toLowerCase()) || null;
}

export function useBetaApplications(): BetaApplication[] {
  const [list, setList] = useState<BetaApplication[]>(loadBetaApplications);
  useEffect(() => {
    const reload = () => setList(loadBetaApplications());
    window.addEventListener(BETA_APPS_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(BETA_APPS_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  return list;
}
