// 益语智库 AI · 内测申请 · 云后端 API 客户端(第二期: 接 cloud_backend)
//
// 契约镜像 cloud_backend 的 beta 端点(PG beta_applications):
//   - 提交  POST   /api/v1/beta/applications           (需登录 session)
//   - 列表  GET    /api/v1/admin/beta/applications      (需 admin session)
//   - 审核  PATCH  /api/v1/admin/beta/applications/:id  (需 admin session; sent:true 触发 SMTP 真发码)
//
// 端点返回**原始对象/数组**(已驼峰),错误用 {detail:...}。统一用 credentials:'include'
// 携带 cookie session;同时复用官网登录 token(Bearer)作双保险。不引入信封解析。

import { getSavedAuthToken } from './storage';

// 生产走相对路径(部署机 nginx 反代到 cloud_backend);如需指向独立云地址,设 VITE_CLOUD_API_BASE_URL。
export const CLOUD_API_BASE = (import.meta as any)?.env?.VITE_CLOUD_API_BASE_URL || '';

export type BetaUserType = 'nonprofit' | 'enterprise' | 'individual';

// 全职人数(后端枚举,与提交契约一致)
export type BetaHeadcount = '5人以内' | '6-20人' | '21-50人' | '50人以上';
export const BETA_HEADCOUNT_OPTIONS: BetaHeadcount[] = ['5人以内', '6-20人', '21-50人', '50人以上'];

// 免费云算力申请情况(可多选;self/none 为排他单选态)
export type BetaCloudCredit = 'tencent' | 'volcano' | 'self' | 'none';
export const BETA_CLOUD_CREDIT_LABEL: Record<BetaCloudCredit, string> = {
  tencent: '腾讯云',
  volcano: '火山云',
  self: '已自有算力与云空间',
  none: '暂无',
};
// self/none 勾选时清空其它;勾 tencent/volcano 时取消 self/none。
export const BETA_CLOUD_CREDIT_EXCLUSIVE: BetaCloudCredit[] = ['self', 'none'];

export const BETA_USER_TYPE_LABEL: Record<BetaUserType, string> = {
  nonprofit: '公益慈善组织',
  enterprise: '企业用户',
  individual: '个人用户',
};

// 后端返回对象(已驼峰)。新增字段:headcount / focusIssue / beneficiaryCount / cloudCredit。
export interface BetaApplication {
  id: string;
  userName: string;
  userEmail: string;
  userType: BetaUserType;
  orgName?: string;
  purpose?: string;
  headcount?: BetaHeadcount | string;
  focusIssue?: string;
  beneficiaryCount?: string;
  cloudCredit?: BetaCloudCredit[];
  status: 'pending' | 'approved';
  code?: string;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 提交载荷(契约):userEmail 用表单填写值;headcount/cloudCredit 受枚举约束。
export interface BetaApplicationSubmitInput {
  userEmail: string;
  userName: string;
  userType: BetaUserType;
  orgName?: string;
  purpose?: string;
  headcount?: BetaHeadcount;
  focusIssue?: string;
  beneficiaryCount?: string;
  cloudCredit?: BetaCloudCredit[];
}

export interface BetaReviewInput {
  code?: string;
  sent?: boolean;
}

function extractError(json: unknown, status: number): string {
  if (json && typeof json === 'object') {
    const detail = (json as Record<string, unknown>).detail
      ?? (json as Record<string, unknown>).error
      ?? (json as Record<string, unknown>).message;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (detail) return JSON.stringify(detail);
  }
  return `请求失败(${status})`;
}

async function betaRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getSavedAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${CLOUD_API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractError(json, res.status));
  }
  return json as T;
}

/** 提交内测申请(需登录)。返回创建/更新后的申请对象,失败抛错(message=后端 detail)。 */
export function submitBetaApplication(payload: BetaApplicationSubmitInput): Promise<BetaApplication> {
  return betaRequest<BetaApplication>('/api/v1/beta/applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** admin 拉取全部内测申请(需 admin session)。 */
export function adminListBetaApplications(): Promise<BetaApplication[]> {
  return betaRequest<BetaApplication[]>('/api/v1/admin/beta/applications');
}

/** admin 审核发码(需 admin session)。sent:true 会触发后端 SMTP 自动发邀请码邮件。 */
export function adminReviewBetaApplication(id: string, input: BetaReviewInput): Promise<BetaApplication> {
  return betaRequest<BetaApplication>(`/api/v1/admin/beta/applications/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'approved', ...input }),
  });
}
