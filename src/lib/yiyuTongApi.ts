import { authRequest, AUTH_BASE, type ApiResult } from './authHttp';

export type YiyuTongMode = 'answer' | 'site_task' | 'consult_handoff';

export interface YiyuTongCitation {
  contentType: 'insight' | 'report' | 'book' | 'methodology' | 'case';
  contentId: string;
  title: string;
  snippet: string;
  tags: string[];
  publishDate: string;
  url: string;
  coverUrl?: string;
  label?: string;
}

export interface YiyuTongAction {
  type: 'open_url' | 'open_list' | 'open_detail' | 'open_consult_form';
  label: string;
  target: string;
  prefillPayload?: Record<string, string>;
}

export interface YiyuTongCollectedFields {
  name?: string;
  organization?: string;
  phone?: string;
  email?: string;
  note?: string;
}

export interface YiyuTongSiteTaskSpec {
  prompt: string;
  bootstrapUrl?: string;
  expectedUrl?: string;
  pageId?: string;
  filters?: {
    searchQuery?: string;
    topic?: string;
    year?: string;
  };
  openTitle?: string;
  openMode?: 'none' | 'exact' | 'first';
  successMessage?: string;
  fallbackAction?: YiyuTongAction | null;
}

export interface YiyuTongConsultHandoff {
  ready: boolean;
  formUrl: string;
  missingFields: string[];
}

export interface YiyuTongResponse {
  mode: YiyuTongMode;
  message: string;
  citations: YiyuTongCitation[];
  taskPlan: string[];
  taskSpec: YiyuTongSiteTaskSpec | null;
  fallbackAction: YiyuTongAction | null;
  handoff: YiyuTongConsultHandoff | null;
  collectedFields: YiyuTongCollectedFields | null;
}

export interface YiyuTongKnownUserInfo {
  nickname?: string;
  phone?: string;
  email?: string;
  organization?: string;
}

export interface YiyuTongHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function queryYiyuTong(payload: {
  question: string;
  sessionId: string;
  currentPage: string;
  currentUrl: string;
  knownUserInfo?: YiyuTongKnownUserInfo;
  history?: YiyuTongHistoryMessage[];
}): Promise<ApiResult<YiyuTongResponse>> {
  return authRequest<YiyuTongResponse>('/assistant/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function proxyYiyuTongPageAgent(body: unknown, signal?: AbortSignal) {
  const response = await fetch(`${AUTH_BASE}/assistant/page-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
  return response;
}
