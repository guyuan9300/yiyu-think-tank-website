/**
 * 多租户权限系统
 * 实现RBAC + ABAC混合权限控制
 */

/**
 * 权限定义
 */
export interface Permission {
  resource: string;
  action: string;
  conditions?: Condition[];
}

/**
 * 条件约束
 */
export interface Condition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt';
  value: unknown;
}

/**
 * 角色定义
 */
export type Role = 'admin' | 'editor' | 'viewer' | 'ai-generator' | 'ai-analyst' | 'client';

/**
 * 角色定义接口
 */
export interface RoleDefinition {
  role: Role;
  displayName: string;
  description: string;
  permissions: Permission[];
  priority: number;
}

/**
 * 租户权限配置
 */
export interface TenantPermissions {
  tenantId: string;
  roles: Map<Role, RoleDefinition>;
  customPermissions: Permission[];
  restrictions: {
    maxContentPerDay?: number;
    maxStorageMB?: number;
    allowedCategories?: string[];
    blockedKeywords?: string[];
    requireApprovalForPublish?: boolean;
    requireApprovalForAiGenerated?: boolean;
  };
}

/**
 * 权限检查结果
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  conditions?: Condition[];
}

/**
 * 预定义角色
 */
export const defaultRoles: RoleDefinition[] = [
  {
    role: 'admin',
    displayName: '管理员',
    description: '完全访问权限',
    priority: 100,
    permissions: [
      { resource: '*', action: '*' },
    ],
  },
  {
    role: 'editor',
    displayName: '编辑',
    description: '内容编辑和管理权限',
    priority: 80,
    permissions: [
      { resource: 'content', action: 'create' },
      { resource: 'content', action: 'read' },
      { resource: 'content', action: 'update' },
      { resource: 'content', action: 'publish' },
      { resource: 'audit', action: 'read' },
    ],
  },
  {
    role: 'ai-generator',
    displayName: 'AI生成器',
    description: 'AI内容生成权限',
    priority: 60,
    permissions: [
      { resource: 'content', action: 'create' },
      { resource: 'content', action: 'read' },
      { resource: 'ai', action: 'generate' },
      { resource: 'ai', action: 'analyze' },
      {
        resource: 'content',
        action: 'publish',
        conditions: [
          { field: 'aiGenerated', operator: 'equals', value: true },
        ],
      },
    ],
  },
  {
    role: 'ai-analyst',
    displayName: 'AI分析器',
    description: 'AI内容分析权限',
    priority: 50,
    permissions: [
      { resource: 'content', action: 'read' },
      { resource: 'ai', action: 'analyze' },
      { resource: 'audit', action: 'read' },
    ],
  },
  {
    role: 'client',
    displayName: '客户',
    description: '受限的客户端权限',
    priority: 10,
    permissions: [
      {
        resource: 'content',
        action: 'read',
        conditions: [
          { field: 'status', operator: 'equals', value: 'published' },
        ],
      },
      { resource: 'ai', action: 'generate' },
    ],
  },
];

/**
 * 权限服务类
 */
class PermissionService {
  private tenantPermissions: Map<string, TenantPermissions> = new Map();
  private readonly storageKey = 'tenant_permissions';
  
  constructor() {
    this.loadPermissions();
  }
  
  /**
   * 从存储加载权限配置
   */
  private loadPermissions(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          this.tenantPermissions = new Map(Object.entries(data));
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    }
  }
  
  /**
   * 保存权限配置
   */
  private savePermissions(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = Object.fromEntries(this.tenantPermissions);
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save permissions:', error);
      }
    }
  }
  
  /**
   * 检查权限
   */
  async checkPermission(
    tenantId: string,
    userRole: Role,
    resource: string,
    action: string,
    context?: Record<string, unknown>
  ): Promise<PermissionResult> {
    const tenantConfig = this.tenantPermissions.get(tenantId);
    if (!tenantConfig) {
      return { allowed: false, reason: 'Tenant not found' };
    }
    
    const roleDef = tenantConfig.roles.get(userRole);
    if (!roleDef) {
      return { allowed: false, reason: 'Role not found' };
    }
    
    // 检查基础权限
    const basePermission = roleDef.permissions.find(
      p => (p.resource === '*' || p.resource === resource) &&
           (p.action === '*' || p.action === action)
    );
    
    if (!basePermission) {
      return { allowed: false, reason: `No base permission for ${resource}:${action}` };
    }
    
    // 检查条件约束
    if (basePermission.conditions && basePermission.conditions.length > 0) {
      if (context) {
        for (const condition of basePermission.conditions) {
          if (!this.evaluateCondition(condition, context)) {
            return { 
              allowed: false, 
              reason: `Condition not met: ${condition.field} ${condition.operator} ${condition.value}` 
            };
          }
        }
      } else {
        return { allowed: false, reason: 'Conditions require context' };
      }
    }
    
    // 检查租户限制
    const restrictionResult = await this.checkRestrictions(
      tenantId, 
      userRole, 
      resource, 
      action,
      context
    );
    if (!restrictionResult.allowed) {
      return restrictionResult;
    }
    
    return { allowed: true };
  }
  
  /**
   * 评估条件
   */
  private evaluateCondition(condition: Condition, context: Record<string, unknown>): boolean {
    const fieldValue = this.getNestedValue(context, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return Array.isArray(fieldValue) && fieldValue.includes(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      default:
        return false;
    }
  }
  
  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let value: unknown = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * 检查租户限制
   */
  private async checkRestrictions(
    tenantId: string,
    role: Role,
    resource: string,
    action: string,
    context?: Record<string, unknown>
  ): Promise<PermissionResult> {
    const config = this.tenantPermissions.get(tenantId);
    if (!config) {
      return { allowed: false, reason: 'Tenant not found' };
    }
    
    const restrictions = config.restrictions;
    
    // 检查发布审批要求
    if (action === 'publish' && restrictions.requireApprovalForPublish) {
      const isAiGenerated = context?.['aiGenerated'] as boolean;
      if (isAiGenerated && !context?.['humanReviewed']) {
        return { 
          allowed: false, 
          reason: 'AI-generated content requires human approval before publishing' 
        };
      }
    }
    
    // 检查分类限制
    if (action === 'create' && restrictions.allowedCategories) {
      const category = context?.['category'] as string;
      if (category && !restrictions.allowedCategories.includes(category)) {
        return { 
          allowed: false, 
          reason: `Category '${category}' is not allowed` 
        };
      }
    }
    
    // 检查关键词屏蔽
    if (action === 'create' || action === 'update') {
      const content = context?.['content'] as string;
      if (content && restrictions.blockedKeywords) {
        for (const keyword of restrictions.blockedKeywords) {
          if (content.includes(keyword)) {
            return { 
              allowed: false, 
              reason: `Content contains blocked keyword: ${keyword}` 
            };
          }
        }
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * 初始化租户权限
   */
  async initializeTenant(tenantId: string): Promise<TenantPermissions> {
    const roles = new Map<Role, RoleDefinition>();
    
    // 初始化默认角色
    for (const role of defaultRoles) {
      roles.set(role.role, { ...role });
    }
    
    const config: TenantPermissions = {
      tenantId,
      roles,
      customPermissions: [],
      restrictions: {},
    };
    
    this.tenantPermissions.set(tenantId, config);
    this.savePermissions();
    
    return config;
  }
  
  /**
   * 更新角色权限
   */
  async updateRolePermissions(
    tenantId: string,
    role: Role,
    permissions: Permission[]
  ): Promise<boolean> {
    const config = this.tenantPermissions.get(tenantId);
    if (!config) {
      return false;
    }
    
    const roleDef = config.roles.get(role);
    if (!roleDef) {
      return false;
    }
    
    roleDef.permissions = permissions;
    config.roles.set(role, roleDef);
    this.savePermissions();
    
    return true;
  }
  
  /**
   * 更新租户限制
   */
  async updateRestrictions(
    tenantId: string,
    restrictions: TenantPermissions['restrictions']
  ): Promise<boolean> {
    const config = this.tenantPermissions.get(tenantId);
    if (!config) {
      return false;
    }
    
    config.restrictions = { ...config.restrictions, ...restrictions };
    this.savePermissions();
    
    return true;
  }
  
  /**
   * 添加自定义权限
   */
  async addCustomPermission(
    tenantId: string,
    permission: Permission
  ): Promise<boolean> {
    const config = this.tenantPermissions.get(tenantId);
    if (!config) {
      return false;
    }
    
    config.customPermissions.push(permission);
    this.savePermissions();
    
    return true;
  }
  
  /**
   * 获取租户配置
   */
  async getTenantPermissions(tenantId: string): Promise<TenantPermissions | null> {
    return this.tenantPermissions.get(tenantId) || null;
  }
  
  /**
   * 获取角色的所有权限
   */
  async getRolePermissions(
    tenantId: string,
    role: Role
  ): Promise<Permission[]> {
    const config = this.tenantPermissions.get(tenantId);
    if (!config) {
      return [];
    }
    
    const roleDef = config.roles.get(role);
    if (!roleDef) {
      return [];
    }
    
    return [...roleDef.permissions, ...config.customPermissions];
  }
  
  /**
   * 检查角色是否存在
   */
  hasRole(tenantId: string, role: Role): boolean {
    const config = this.tenantPermissions.get(tenantId);
    if (!config) {
      return false;
    }
    
    return config.roles.has(role);
  }
  
  /**
   * 获取所有可用角色
   */
  listRoles(): RoleDefinition[] {
    return defaultRoles;
  }
}

// 导出单例
export const permissionService = new PermissionService();
