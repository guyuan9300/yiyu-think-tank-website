// 发版与反馈控制台 · 云后端 API 客户端
//
// 为什么不复用 authHttp.ts 的 authRequest:
//   - authRequest 默认前缀 /api/auth,且把响应当 {ok,data,error} 信封解析(取 json.data)。
//   - 但 cloud_backend 的 release 端点(routes_releases.py)挂在 /api/v1/...,且用 FastAPI
//     response_model 直接返回**原始对象/数组**(不是信封),错误用 {detail:...}。
//   两者不兼容,所以这里写一个匹配 release 端点真实形态的专用客户端(返回原始 json 作 data,
//   错误读 detail),不改后端。token 仍复用官网登录存的 yiyu_auth_token。
import { getSavedAuthToken } from './storage';

// 生产走相对路径(由部署机 nginx 反代到 cloud_backend);dev 需在 vite 插件加 /api/v1 转发。
// 如需指向独立云地址,设 VITE_CLOUD_API_BASE_URL(如 https://yiyu.love)。
export const CLOUD_API_BASE = (import.meta as any)?.env?.VITE_CLOUD_API_BASE_URL || '';

export interface ReleaseApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
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

async function cloudRequest<T = unknown>(path: string, init?: RequestInit): Promise<ReleaseApiResult<T>> {
  try {
    const headers = new Headers(init?.headers || {});
    if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    const token = getSavedAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(`${CLOUD_API_BASE}${path}`, { ...init, headers });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: extractError(json, res.status), status: res.status };
    }
    return { ok: true, data: json as T, status: res.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '网络异常，请稍后重试' };
  }
}

// ── 类型(镜像 cloud_backend/app/routes_releases.py 的 camelCase 模型)─────────────
export type ReleaseStatus = 'draft' | 'testing' | 'published' | 'rolled_back';
export type AssignmentTargetType = 'all' | 'org' | 'group';
export type AssignmentStatus = 'active' | 'paused' | 'rolled_back';
export type FeedbackKind = 'bug' | 'lag' | 'inaccurate' | 'feature' | 'experience';
export type FeedbackSeverity = 'blocker' | 'impaired' | 'minor';
export type FeedbackStatus =
  | 'open' | 'confirmed' | 'triaged' | 'in_progress' | 'resolved' | 'next_release' | 'wontfix' | 'closed';

export interface ReleaseRecord {
  id: string;
  version: string;
  status: ReleaseStatus;
  platforms: string[];
  mandatory: boolean;
  userNotes: Record<string, string[]>;
  internalNotes: string;
  screenshots: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AssignmentRecord {
  id: string;
  releaseId: string;
  targetType: AssignmentTargetType;
  orgCode: string | null;
  rolloutPct: number;
  mandatory: boolean;
  status: AssignmentStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PackageRecord {
  id: string;
  releaseId: string;
  platform: string;
  fileName: string;
  sizeBytes: number;
  sha512: string;
  downloadUrl: string;
  blockmapUrl: string | null;
  downloadable: boolean;
  publishedAt: string | null;
}

export interface FeedbackRecord {
  id: string;
  kind: FeedbackKind;
  severity: FeedbackSeverity;
  title: string;
  description: string;
  submitterUserId: string | null;
  submitterName: string;
  orgCode: string | null;
  version: string | null;
  page: string | null;
  os: string | null;
  screenshotUrl: string | null;
  logExcerpt: string | null;
  status: FeedbackStatus;
  dupOf: string | null;
  linkedTaskId: string | null;
  linkedReleaseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgSummaryRecord {
  id: string;
  name: string;
  code: string; // = organizations.slug,定向推送的组织代码
  memberCount: number;
  installCount: number; // 占位:待客户端安装上报接通后才有真值
}

export interface ReleaseCreateInput {
  version: string;
  platforms?: string[];
  mandatory?: boolean;
  userNotes?: Record<string, string[]>;
  internalNotes?: string;
  screenshots?: string[];
}

export interface ReleasePatchInput {
  status?: ReleaseStatus;
  platforms?: string[];
  mandatory?: boolean;
  userNotes?: Record<string, string[]>;
  internalNotes?: string;
  screenshots?: string[];
}

export interface AssignmentCreateInput {
  targetType?: AssignmentTargetType;
  orgCode?: string | null;
  rolloutPct?: number;
  mandatory?: boolean;
}

export interface AssignmentPatchInput {
  status?: AssignmentStatus;
  targetType?: AssignmentTargetType;
  orgCode?: string | null;
  rolloutPct?: number;
  mandatory?: boolean;
}

export interface FeedbackPatchInput {
  status?: FeedbackStatus;
  severity?: FeedbackSeverity;
  dupOf?: string | null;
  linkedTaskId?: string | null;
  linkedReleaseId?: string | null;
}

export interface FeedbackListParams {
  status?: FeedbackStatus;
  kind?: FeedbackKind;
  severity?: FeedbackSeverity;
  limit?: number;
  offset?: number;
}

const enc = encodeURIComponent;

// ── 版本管理 ──────────────────────────────────────────
export const listReleases = () => cloudRequest<ReleaseRecord[]>('/api/v1/admin/releases');

export const createRelease = (input: ReleaseCreateInput) =>
  cloudRequest<ReleaseRecord>('/api/v1/admin/releases', { method: 'POST', body: JSON.stringify(input) });

export const patchRelease = (id: string, input: ReleasePatchInput) =>
  cloudRequest<ReleaseRecord>(`/api/v1/admin/releases/${enc(id)}`, { method: 'PATCH', body: JSON.stringify(input) });

// ── 定向推送(指派)─────────────────────────────────────
export const listAssignments = (releaseId: string) =>
  cloudRequest<AssignmentRecord[]>(`/api/v1/admin/releases/${enc(releaseId)}/assignments`);

export const createAssignment = (releaseId: string, input: AssignmentCreateInput) =>
  cloudRequest<AssignmentRecord>(`/api/v1/admin/releases/${enc(releaseId)}/assignments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const patchAssignment = (releaseId: string, assignmentId: string, input: AssignmentPatchInput) =>
  cloudRequest<AssignmentRecord>(`/api/v1/admin/releases/${enc(releaseId)}/assignments/${enc(assignmentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

// ── 用户反馈 ──────────────────────────────────────────
export function listFeedback(params: FeedbackListParams = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.kind) q.set('kind', params.kind);
  if (params.severity) q.set('severity', params.severity);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return cloudRequest<FeedbackRecord[]>(`/api/v1/admin/feedback${qs ? `?${qs}` : ''}`);
}

export const patchFeedback = (id: string, input: FeedbackPatchInput) =>
  cloudRequest<FeedbackRecord>(`/api/v1/admin/feedback/${enc(id)}`, { method: 'PATCH', body: JSON.stringify(input) });

// ── 组织(定向推送的组织表)─────────────────────────────
export const listOrganizations = () => cloudRequest<OrgSummaryRecord[]>('/api/v1/admin/organizations');

// ── 公开下载页派生用 ──────────────────────────────────
export const getLatestRelease = (platform = 'mac') =>
  cloudRequest<ReleaseRecord | null>(`/api/v1/releases/latest?platform=${enc(platform)}`);
