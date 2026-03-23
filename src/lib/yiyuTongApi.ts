import { authRequest, type ApiResult } from './authHttp';

export type YiyuTongMode = 'answer' | 'navigate' | 'consult_intake';

export interface YiyuTongSourceCard {
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

export interface YiyuTongResponse {
  mode: YiyuTongMode;
  answer: string;
  sourceCards: YiyuTongSourceCard[];
  actions: YiyuTongAction[];
  collectedFields: YiyuTongCollectedFields | null;
  followups: string[];
}

export interface YiyuTongKnownUserInfo {
  nickname?: string;
  phone?: string;
  email?: string;
  organization?: string;
}

export function queryYiyuTong(payload: {
  question: string;
  sessionId: string;
  currentPage: string;
  currentUrl: string;
  knownUserInfo?: YiyuTongKnownUserInfo;
}): Promise<ApiResult<YiyuTongResponse>> {
  return authRequest<YiyuTongResponse>('/assistant/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
