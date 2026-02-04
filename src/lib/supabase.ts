/**
 * Supabase 客户端配置
 * 用于连接Supabase后端服务
 */
import { createClient } from '@supabase/supabase-js';

// 从环境变量获取配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bnflqessqkkxsrumwbkb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_igknTd2-xDRARspwBxk9EQ_qU0XzFy-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 服务端专用客户端（使用service_role_key）
// 注意：仅在后端API路由中使用，不要在前端代码中暴露service_role_key
export const createServerClient = (serviceRoleKey: string) => {
  return createClient(supabaseUrl, serviceRoleKey);
};

export default supabase;
