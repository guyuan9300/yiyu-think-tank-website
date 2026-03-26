import { authRequest, AUTH_BASE, type ApiResult } from './authHttp';

export type YiyuTongMode = 'site_task' | 'site_tour' | 'form_task' | 'mixed_task' | 'answer';
export type YiyuTongExecutor = 'same_tab_page_agent' | 'multi_tab_extension' | 'none';

export interface YiyuTongCitation {
  contentType: 'insight' | 'report' | 'book' | 'methodology' | 'case' | 'page';
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
  role?: string;
  phone?: string;
  email?: string;
  topic?: string;
  background?: string;
  constraints?: string;
  commitment?: string;
  notes?: string;
}

export interface YiyuTongTaskStep {
  id: string;
  label: string;
  detail?: string;
}

export interface YiyuTongTaskRouteNode {
  id: string;
  pageId?: string;
  pageLabel?: string;
  level?: 'primary' | 'secondary' | 'detail' | 'utility';
  enterable?: boolean;
  action?: string;
  target?: string;
  detail?: string;
}

export interface YiyuTongTaskRule {
  kind: string;
  detail?: string;
  target?: string;
}

export interface YiyuTongTaskFinalState {
  pageId?: string;
  url?: string;
  note?: string;
}

export type YiyuTongSameTabGraphStep =
  | {
      id: string;
      type: 'open_url';
      target: string;
      pageId?: string;
      detail?: string;
    }
  | {
      id: string;
      type: 'set_filters';
      filters: {
        searchQuery?: string;
        topic?: string;
        year?: string;
      };
      detail?: string;
    }
  | {
      id: string;
      type: 'set_sort_mode';
      sortMode: string;
      detail?: string;
    }
  | {
      id: string;
      type: 'go_to_page';
      pageNumber: number;
      detail?: string;
    }
  | {
      id: string;
      type: 'open_content_card';
      title?: string;
      mode?: 'exact' | 'first' | 'last';
      detail?: string;
    }
  | {
      id: string;
      type: 'scroll_section';
      sectionId?: string;
      passes?: number;
      detail?: string;
    }
  | {
      id: string;
      type: 'expand_section';
      sectionId: string;
      detail?: string;
    }
  | {
      id: string;
      type: 'fill_local_form_fields';
      fields: YiyuTongCollectedFields;
      detail?: string;
    }
  | {
      id: string;
      type: 'fill_comment';
      text: string;
      detail?: string;
    }
  | {
      id: string;
      type: 'submit_comment';
      detail?: string;
    }
  | {
      id: string;
      type: 'submit_local_form';
      detail?: string;
    };

export interface YiyuTongTaskEntities {
  contentTypes?: Array<'insight' | 'report' | 'book' | 'methodology' | 'case'>;
  topic?: string;
  pageTarget?: string;
  targetTitle?: string;
  targetId?: string;
  wantsLatest?: boolean;
  wantsFirst?: boolean;
  wantsLast?: boolean;
  wantsSummary?: boolean;
  query?: string;
}

export interface YiyuTongFallbackPlan {
  action?: YiyuTongAction | null;
  message?: string | null;
}

export interface YiyuTongTourStop {
  id: string;
  label: string;
  url: string;
  pageId?: string;
  summary?: string;
  scrollPasses?: number;
  isTransitStop?: boolean;
  sections?: Array<{
    id: string;
    title: string;
    type?: string;
    order?: number;
    enterable?: boolean;
  }>;
  returnUrl?: string;
  returnPageId?: string;
  isRepresentativeChild?: boolean;
  isRepresentativeDetail?: boolean;
}

export interface YiyuTongSameTabExecutionPlan {
  executor: 'same_tab_page_agent';
  prompt: string;
  kind: 'site_task' | 'site_tour' | 'mixed_task';
  bootstrapUrl?: string;
  expectedUrl?: string;
  pageId?: string;
  filters?: {
    searchQuery?: string;
    topic?: string;
    year?: string;
  };
  sortMode?: string;
  pageNumber?: number;
  openTitle?: string;
  openMode?: 'none' | 'exact' | 'first' | 'last';
  successMessage?: string;
  tourStops?: YiyuTongTourStop[];
  graphSteps?: YiyuTongSameTabGraphStep[];
  route?: YiyuTongTaskRouteNode[];
  completionRules?: YiyuTongTaskRule[];
  failureRules?: YiyuTongTaskRule[];
  completionCheck?:
    | {
        type: 'comment_submission';
        contentId: string;
        contentType: 'insight' | 'report' | 'book' | 'methodology';
        expectedText: string;
      }
    | {
        type: 'local_form_submission';
        statusText: string;
      }
    | null;
}

export interface YiyuTongFormContext {
  active: boolean;
  formUrl: string;
  fields: YiyuTongCollectedFields;
  missingFields: string[];
  extensionRequired: boolean;
}

export interface YiyuTongMultiTabExecutionPlan {
  executor: 'multi_tab_extension';
  prompt: string;
  formUrl: string;
  fields: YiyuTongCollectedFields;
  missingFields: string[];
}

export interface YiyuTongNoopExecutionPlan {
  executor: 'none';
}

export type YiyuTongExecutionPlan =
  | YiyuTongSameTabExecutionPlan
  | YiyuTongMultiTabExecutionPlan
  | YiyuTongNoopExecutionPlan;

export interface YiyuTongResponse {
  mode: YiyuTongMode;
  goal: string;
  entities: YiyuTongTaskEntities | null;
  message: string;
  userVisiblePlan?: string | null;
  route?: YiyuTongTaskRouteNode[];
  steps: YiyuTongTaskStep[];
  completionRules?: YiyuTongTaskRule[];
  failureRules?: YiyuTongTaskRule[];
  citations: YiyuTongCitation[];
  finalState?: YiyuTongTaskFinalState | null;
  executionPlan: YiyuTongExecutionPlan;
  fallbackPlan: YiyuTongFallbackPlan | null;
  formContext: YiyuTongFormContext | null;
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
  activeFormContext?: YiyuTongFormContext | null;
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
