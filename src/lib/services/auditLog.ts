/**
 * AI审计日志服务
 * 实现完整的AI操作追踪、审计和回滚功能
 */

import type {
  AIOperationLog,
  LogQueryParams,
  AuditReport,
  DiffResult,
  RollbackRequest,
  ChangeSummary,
  RiskLevel,
  ApprovalStatus,
  ExecutionStatus,
} from '../schemas/audit';

/**
 * SHA256哈希工具函数
 */
async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成请求追踪ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 风险级别映射
 */
function calculateRiskLevel(operationType: string): RiskLevel {
  const riskMap: Record<string, RiskLevel> = {
    create: 'low',
    update: 'medium',
    publish: 'high',
    delete: 'critical',
    analyze: 'low',
    generate: 'medium',
    approve: 'medium',
    reject: 'low',
    unpublish: 'high',
    rollback: 'medium',
  };
  return riskMap[operationType] || 'medium';
}

/**
 * 变更摘要生成
 */
function generateChangeSummary(changes: ChangeSummary[]): string {
  const added = changes.filter(c => c.changeType === 'added').length;
  const modified = changes.filter(c => c.changeType === 'modified').length;
  const removed = changes.filter(c => c.changeType === 'removed').length;
  
  const parts: string[] = [];
  if (added > 0) parts.push(`+${added}新增`);
  if (modified > 0) parts.push(`~${modified}修改`);
  if (removed > 0) parts.push(`-${removed}删除`);
  
  return parts.join(', ');
}

/**
 * 审计日志服务类
 */
class AuditLogService {
  private logs: AIOperationLog[] = [];
  private storageKey = 'ai_audit_logs';
  
  constructor() {
    this.loadFromStorage();
  }
  
  /**
   * 从存储加载日志
   */
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.logs = JSON.parse(stored);
        }
      } catch (error) {
        console.error('Failed to load audit logs:', error);
        this.logs = [];
      }
    }
  }
  
  /**
   * 保存日志到存储
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
      } catch (error) {
        console.error('Failed to save audit logs:', error);
      }
    }
  }
  
  /**
   * 记录操作日志
   */
  async logOperation(operation: Partial<AIOperationLog>): Promise<AIOperationLog> {
    const log: AIOperationLog = {
      logId: generateId(),
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      status: 'success',
      approvalStatus: 'auto',
      processingTime: 0,
      riskLevel: operation.operationType ? calculateRiskLevel(operation.operationType) : 'medium',
      requiresHumanReview: false,
      rollbackAvailable: true,
      agentId: operation.agentId || 'unknown',
      agentName: operation.agentName || 'Unknown Agent',
      agentType: operation.agentType || 'internal',
      operationType: operation.operationType || 'create',
      contentType: operation.contentType || 'article',
      contentId: operation.contentId || '',
      contentTitle: operation.contentTitle || '',
      inputHash: '',
      outputHash: '',
      ...operation,
    };
    
    // 设置默认值
    if (!log.riskLevel) {
      log.riskLevel = calculateRiskLevel(log.operationType);
    }
    
    // 判断是否需要人工审核
    if (log.riskLevel === 'high' || log.riskLevel === 'critical') {
      log.approvalStatus = 'pending';
      log.requiresHumanReview = true;
    }
    
    // 计算哈希
    const content = JSON.stringify(operation);
    log.inputHash = await calculateHash(content);
    log.outputHash = await calculateHash(JSON.stringify(log));
    
    this.logs.push(log);
    this.saveToStorage();
    
    // 发送审核通知
    if (log.requiresHumanReview) {
      await this.sendReviewNotification(log);
    }
    
    return log;
  }
  
  /**
   * 生成变更差异
   */
  async generateDiff(
    contentId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): Promise<DiffResult> {
    const changes: ChangeSummary[] = [];
    
    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);
    
    for (const key of allKeys) {
      const beforeVal = before[key];
      const afterVal = after[key];
      
      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        changes.push({
          field: key,
          before: beforeVal,
          after: afterVal,
          changeType: beforeVal === undefined ? 'added' 
            : afterVal === undefined ? 'removed' 
            : 'modified',
        });
      }
    }
    
    return {
      contentId,
      fromVersion: (before as any).version || 0,
      toVersion: (after as any).version || 1,
      changeCount: changes.length,
      changes,
      summary: generateChangeSummary(changes),
    };
  }
  
  /**
   * 回滚操作
   */
  async rollback(request: RollbackRequest): Promise<boolean> {
    const originalLog = this.logs.find(l => l.logId === request.logId);
    
    if (!originalLog) {
      console.error('Rollback failed: log not found');
      return false;
    }
    
    if (!originalLog.rollbackAvailable) {
      console.error('Rollback failed: rollback not available for this log');
      return false;
    }
    
    // 标记原操作为已回滚
    originalLog.status = 'rolled-back';
    
    // 创建回滚操作日志
    const rollbackLog: AIOperationLog = {
      ...originalLog,
      logId: generateId(),
      timestamp: new Date().toISOString(),
      operationType: 'rollback',
      status: 'success',
      approvalStatus: 'auto',
      requiresHumanReview: false,
      metadata: {
        ...originalLog.metadata,
        rollbackOf: request.logId,
        rollbackReason: request.reason,
        rollbackBy: request.requestedBy,
      },
    };
    
    this.logs.push(rollbackLog);
    this.saveToStorage();
    
    return true;
  }
  
  /**
   * 查询审计日志
   */
  async queryLogs(filters: LogQueryParams): Promise<AIOperationLog[]> {
    let results = [...this.logs];
    
    // 应用过滤条件
    if (filters.agentId) {
      results = results.filter(l => l.agentId === filters.agentId);
    }
    if (filters.contentId) {
      results = results.filter(l => l.contentId === filters.contentId);
    }
    if (filters.operationType) {
      results = results.filter(l => l.operationType === filters.operationType);
    }
    if (filters.status) {
      results = results.filter(l => l.status === filters.status);
    }
    if (filters.riskLevel) {
      results = results.filter(l => l.riskLevel === filters.riskLevel);
    }
    if (filters.approvalStatus) {
      results = results.filter(l => l.approvalStatus === filters.approvalStatus);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      results = results.filter(l => new Date(l.timestamp) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      results = results.filter(l => new Date(l.timestamp) <= end);
    }
    
    // 排序
    results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // 分页
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const start = (page - 1) * limit;
    
    return results.slice(start, start + limit);
  }
  
  /**
   * 生成审计报告
   */
  async generateAuditReport(startDate: string, endDate: string): Promise<AuditReport> {
    const logs = await this.queryLogs({ startDate, endDate });
    
    // 统计各分类
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};
    const agentCounts: Record<string, number> = {};
    
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    for (const log of logs) {
      // 按类型统计
      byType[log.operationType] = (byType[log.operationType] || 0) + 1;
      
      // 按状态统计
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
      
      // 按风险统计
      byRiskLevel[log.riskLevel] = (byRiskLevel[log.riskLevel] || 0) + 1;
      
      // 按代理统计
      agentCounts[log.agentName] = (agentCounts[log.agentName] || 0) + 1;
      
      // 计算平均置信度
      if (log.confidenceScore !== undefined) {
        totalConfidence += log.confidenceScore;
        confidenceCount++;
      }
    }
    
    return {
      period: { startDate, endDate },
      totalOperations: logs.length,
      byType: byType as AuditReport['byType'],
      byStatus: byStatus as AuditReport['byStatus'],
      byRiskLevel: byRiskLevel as AuditReport['byRiskLevel'],
      averageConfidenceScore: confidenceCount > 0 
        ? Number((totalConfidence / confidenceCount).toFixed(2)) 
        : 0,
      pendingReviews: logs.filter(l => l.approvalStatus === 'pending').length,
      rollbacks: logs.filter(l => l.status === 'rolled-back').length,
      topAgents: Object.entries(agentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
  
  /**
   * 发送审核通知
   */
  private async sendReviewNotification(log: AIOperationLog): Promise<void> {
    // TODO: 集成通知系统（邮件、Slack、微信等）
    console.log('Review notification sent for log:', log.logId);
    
    // 示例通知数据
    const notification = {
      type: 'human_review_required',
      logId: log.logId,
      operationType: log.operationType,
      contentTitle: log.contentTitle,
      riskLevel: log.riskLevel,
      timestamp: log.timestamp,
      agentName: log.agentName,
    };
    
    // 存储通知
    const notifications = JSON.parse(
      localStorage.getItem('ai_review_notifications') || '[]'
    );
    notifications.push(notification);
    localStorage.setItem('ai_review_notifications', JSON.stringify(notifications));
  }
  
  /**
   * 审批操作
   */
  async approveOperation(
    logId: string,
    approver: string,
    comment?: string
  ): Promise<boolean> {
    const log = this.logs.find(l => l.logId === logId);
    
    if (!log) {
      return false;
    }
    
    log.approvalStatus = 'approved';
    log.approvedBy = approver;
    log.approvalComment = comment;
    log.approvedAt = new Date().toISOString();
    
    this.saveToStorage();
    
    return true;
  }
  
  /**
   * 拒绝操作
   */
  async rejectOperation(
    logId: string,
    approver: string,
    comment: string
  ): Promise<boolean> {
    const log = this.logs.find(l => l.logId === logId);
    
    if (!log) {
      return false;
    }
    
    log.approvalStatus = 'rejected';
    log.approvedBy = approver;
    log.approvalComment = comment;
    log.approvedAt = new Date().toISOString();
    log.status = 'failed';
    log.errorMessage = `Rejected by ${approver}: ${comment}`;
    
    this.saveToStorage();
    
    return true;
  }
  
  /**
   * 获取待审核列表
   */
  async getPendingReviews(): Promise<AIOperationLog[]> {
    return this.logs.filter(l => l.approvalStatus === 'pending')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  
  /**
   * 获取操作统计
   */
  async getOperationStats(days: number = 7): Promise<Record<string, unknown>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const logs = await this.queryLogs({ 
      startDate: startDate.toISOString(),
      limit: 10000,
    });
    
    return {
      period: `${days} days`,
      totalOperations: logs.length,
      byType: logs.reduce((acc, log) => {
        acc[log.operationType] = (acc[log.operationType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: logs.reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      successRate: logs.length > 0
        ? Number(((logs.filter(l => l.status === 'success').length / logs.length) * 100).toFixed(2))
        : 0,
    };
  }
}

// 导出单例
export const auditLogService = new AuditLogService();
