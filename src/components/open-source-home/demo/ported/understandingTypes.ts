// 从益语智库 2.1 软件仓库 src/shared/types.ts 原样搬来的类型（供搬过来的真实组件使用）。
// 不要在官网这边改动语义，保持与软件一致。

export type UnderstandingMode = 'basic' | 'enhanced';

export interface UnderstandingSourceBreakdown {
  sourceType:
    | 'org_dna'
    | 'client_background'
    | 'quarterly_focus'
    | 'task_title'
    | 'task_desc'
    | 'review_note'
    | 'event_line_memory'
    | 'meeting'
    | 'support_request'
    | 'calendar'
    | 'attachment';
  available: boolean;
  label: string;
}

export interface UnderstandingOptionalAdvice {
  realBlocker?: string | null;
  timeGate?: string | null;
  minimumAction?: string | null;
  supportAsk?: string | null;
}

export interface UnderstandingSnapshotV1 {
  taskId: string;
  mode: UnderstandingMode;
  coverage: number;
  confidence: number;
  humanBrief?: string | null;
  whatIsThis: string;
  whyItMatters: string;
  progressNow: string;
  unknowns: string;
  knownFacts: string[];
  optionalAdvice?: UnderstandingOptionalAdvice | null;
  sourceBreakdown: UnderstandingSourceBreakdown[];
}

export interface ReviewMetricCard {
  key: 'timely_completion' | 'department_alignment' | 'strategy_alignment' | 'reflection_capture';
  label: string;
  valueText: string;
  numerator: number;
  denominator: number;
  rate: number;
  description: string;
  tone: 'positive' | 'neutral' | 'warning' | 'risk';
}
