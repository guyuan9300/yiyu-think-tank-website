/**
 * AI审计日志Schema定义
 * 记录所有AI操作的完整上下文，支持追溯和回滚
 */

/**
 * AI操作类型枚举
 */
export type AIOperationType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'publish' 
  | 'unpublish' 
  | 'analyze' 
  | 'generate' 
  | 'approve' 
  | 'reject' 
  | 'rollback';

/**
 * AI客户端类型
 */
export type AIAgentType = 'internal' | 'client' | 'system';

/**
 * 审批状态
 */
export type ApprovalStatus = 'auto' | 'pending' | 'approved' | 'rejected' | 'revised';

/**
 * 风险级别
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 执行状态
 */
export type ExecutionStatus = 'success' | 'partial' | 'failed' | 'rolled-back';

/**
 * AI操作日志主接口
 */
export interface AIOperationLog {
  // 基础标识
  logId: string;
  timestamp: string;
  requestId: string;
  
  // 执行者信息
  agentId: string;
  agentName: string;
  agentType: AIAgentType;
  userId?: string;
  
  // 操作详情
  operationType: AIOperationType;
  contentType: 'report' | 'article' | 'insight' | 'metadata' | 'config';
  contentId: string;
  contentTitle: string;
  
  // 输入输出指纹
  inputHash: string;
  outputHash: string;
  diffSummary?: string;
  
  // AI模型参数
  aiModel?: string;
  promptTemplate?: string;
  generationParams?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  
  // 质量指标
  confidenceScore?: number;
  qualityScore?: number;
  processingTime: number;
  
  // 审批流程
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvalComment?: string;
  approvedAt?: string;
  
  // 风险控制
  riskLevel: RiskLevel;
  requiresHumanReview: boolean;
  rollbackAvailable: boolean;
  
  // 执行结果
  status: ExecutionStatus;
  errorMessage?: string;
  errorCode?: string;
  
  // 上下文
  clientIP?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 日志查询参数
 */
export interface LogQueryParams {
  agentId?: string;
  contentId?: string;
  operationType?: AIOperationType;
  status?: ExecutionStatus;
  riskLevel?: RiskLevel;
  approvalStatus?: ApprovalStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * 审计报告汇总
 */
export interface AuditReport {
  period: {
    startDate: string;
    endDate: string;
  };
  totalOperations: number;
  byType: Record<AIOperationType, number>;
  byStatus: Record<ExecutionStatus, number>;
  byRiskLevel: Record<RiskLevel, number>;
  averageConfidenceScore: number;
  pendingReviews: number;
  rollbacks: number;
  topAgents: Array<{
    name: string;
    count: number;
  }>;
}

/**
 * 变更摘要
 */
export interface ChangeSummary {
  field: string;
  before: unknown;
  after: unknown;
  changeType: 'added' | 'modified' | 'removed';
}

/**
 * 版本差异对比结果
 */
export interface DiffResult {
  contentId: string;
  fromVersion: number;
  toVersion: number;
  changeCount: number;
  changes: ChangeSummary[];
  summary: string;
}

/**
 * 回滚请求
 */
export interface RollbackRequest {
  logId: string;
  reason: string;
  requestedBy: string;
}

/**
 * 回滚结果
 */
export interface RollbackResult {
  success: boolean;
  originalLogId: string;
  rollbackLogId: string;
  contentId: string;
  restoredToVersion: number;
  timestamp: string;
}
