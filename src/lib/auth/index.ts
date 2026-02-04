/**
 * Auth模块导出
 */

export { permissionService } from './permissionService';
export type { 
  Permission, 
  Condition, 
  Role, 
  RoleDefinition,
  TenantPermissions,
  PermissionResult,
} from './permissionService';

// 导出预定义角色
export { defaultRoles } from './permissionService';
