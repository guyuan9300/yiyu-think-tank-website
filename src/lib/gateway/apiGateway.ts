/**
 * API Gateway核心实现（前端兼容版）
 * 提供认证授权、流量控制、请求路由等功能
 */

/**
 * 租户配置接口
 */
export interface TenantConfig {
  tenantId: string;
  tenantName: string;
  apiKey: string;
  permissions: string[];
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  quota: {
    daily: number;
    monthly: number;
  };
  allowedModels: string[];
  allowedContentTypes: string[];
  ipWhitelist?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 请求上下文
 */
export interface RequestContext {
  tenantId: string;
  tenantName: string;
  userId?: string;
  apiKey: string;
  permissions: string[];
  requestTimestamp: string;
  requestId: string;
  ip: string;
}

/**
 * 使用统计
 */
export interface UsageStats {
  tenantId: string;
  period: 'daily' | 'monthly';
  totalRequests: number;
  quota: number;
  usagePercentage: number;
  byEndpoint: Record<string, number>;
  byStatus: Record<string, number>;
}

/**
 * 认证结果
 */
export interface AuthResult {
  success: boolean;
  context?: RequestContext;
  error?: string;
}

/**
 * API Gateway类（前端兼容版）
 */
export class APIGateway {
  private tenantConfigs: Map<string, TenantConfig> = new Map();
  private requestHistory: RequestContext[] = [];
  private readonly storageKey = 'api_gateway_tenants';
  
  constructor() {
    this.loadTenants();
  }
  
  /**
   * 从存储加载租户配置
   */
  private loadTenants(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          this.tenantConfigs = new Map(Object.entries(data));
        }
      } catch (error) {
        console.error('Failed to load tenant configs:', error);
      }
    }
  }
  
  /**
   * 保存租户配置
   */
  private saveTenants(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = Object.fromEntries(this.tenantConfigs);
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save tenant configs:', error);
      }
    }
  }
  
  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * 获取客户端IP（模拟）
   */
  private getClientIp(): string {
    return '127.0.0.1';
  }
  
  /**
   * 认证请求
   */
  async authenticate(
    apiKey: string,
    tenantId?: string
  ): Promise<AuthResult> {
    if (!apiKey) {
      return { success: false, error: 'API key is required' };
    }
    
    const config = this.tenantConfigs.get(apiKey);
    if (!config) {
      return { success: false, error: 'Invalid API key' };
    }
    
    if (tenantId && config.tenantId !== tenantId) {
      return { success: false, error: 'Tenant ID mismatch' };
    }
    
    if (!await this.checkQuota(config)) {
      return { success: false, error: 'Quota exceeded' };
    }
    
    const context: RequestContext = {
      tenantId: config.tenantId,
      tenantName: config.tenantName,
      apiKey,
      permissions: config.permissions,
      requestTimestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      ip: this.getClientIp(),
    };
    
    this.requestHistory.push(context);
    return { success: true, context };
  }
  
  /**
   * 检查配额
   */
  private async checkQuota(config: TenantConfig): Promise<boolean> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const todayRequests = this.requestHistory.filter(
      r => r.tenantId === config.tenantId && 
           r.requestTimestamp.startsWith(today)
    ).length;
    
    return todayRequests < config.quota.daily;
  }
  
  /**
   * 检查权限
   */
  async checkPermission(
    context: RequestContext,
    resource: string,
    action: string
  ): Promise<{ allowed: boolean; error?: string }> {
    const hasPermission = context.permissions.some(
      p => (p === '*' || p === `${resource}:*` || p === `${resource}:${action}`) ||
           (p === '*:*')
    );
    
    if (!hasPermission) {
      return { 
        allowed: false, 
        error: `No permission for ${resource}:${action}` 
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * 注册租户
   */
  async registerTenant(
    config: Omit<TenantConfig, 'apiKey'>
  ): Promise<{ apiKey: string }> {
    const apiKey = `aky_${this.generateSecureToken(32)}`;
    
    const fullConfig: TenantConfig = {
      ...config,
      apiKey,
    };
    
    this.tenantConfigs.set(apiKey, fullConfig);
    this.saveTenants();
    
    return { apiKey };
  }
  
  /**
   * 生成安全令牌
   */
  private generateSecureToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    
    return result;
  }
  
  /**
   * 获取使用统计
   */
  async getUsageStats(
    tenantId: string,
    period: 'daily' | 'monthly' = 'daily'
  ): Promise<UsageStats> {
    const config = Array.from(this.tenantConfigs.values())
      .find(c => c.tenantId === tenantId);
    
    if (!config) {
      throw new Error('Tenant not found');
    }
    
    const now = new Date();
    let startDate: Date;
    
    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const requests = this.requestHistory.filter(
      r => r.tenantId === tenantId &&
           new Date(r.requestTimestamp) >= startDate
    );
    
    return {
      tenantId,
      period,
      totalRequests: requests.length,
      quota: config.quota[period],
      usagePercentage: (requests.length / config.quota[period]) * 100,
      byEndpoint: {},
      byStatus: {},
    };
  }
  
  /**
   * 更新租户配置
   */
  async updateTenant(
    apiKey: string,
    updates: Partial<TenantConfig>
  ): Promise<boolean> {
    const config = this.tenantConfigs.get(apiKey);
    if (!config) {
      return false;
    }
    
    const updatedConfig = { ...config, ...updates };
    this.tenantConfigs.set(apiKey, updatedConfig);
    this.saveTenants();
    
    return true;
  }
  
  /**
   * 删除租户
   */
  async deleteTenant(apiKey: string): Promise<boolean> {
    const deleted = this.tenantConfigs.delete(apiKey);
    if (deleted) {
      this.saveTenants();
    }
    return deleted;
  }
  
  /**
   * 获取所有租户
   */
  listTenants(): TenantConfig[] {
    return Array.from(this.tenantConfigs.values());
  }
  
  /**
   * 验证API密钥
   */
  async validateAPIKey(
    apiKey: string
  ): Promise<{ valid: boolean; tenantId?: string; permissions?: string[] }> {
    const config = this.tenantConfigs.get(apiKey);
    
    if (!config) {
      return { valid: false };
    }
    
    return {
      valid: true,
      tenantId: config.tenantId,
      permissions: config.permissions,
    };
  }
  
  /**
   * 速率限制检查
   */
  async checkRateLimit(
    clientIp: string,
    endpoint: string,
    limit: { requests: number; windowMs: number }
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const windowStart = Date.now() - limit.windowMs;
    
    const recentRequests = this.requestHistory.filter(
      r => r.ip === clientIp && 
           new Date(r.requestTimestamp).getTime() > windowStart
    ).length;
    
    if (recentRequests >= limit.requests) {
      return { 
        allowed: false, 
        retryAfter: Math.ceil(limit.windowMs / 1000) 
      };
    }
    
    return { allowed: true };
  }
}

// 导出单例
export const apiGateway = new APIGateway();
