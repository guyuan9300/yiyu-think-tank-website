// AI 生成资产(文章封面/插图)的访问基址。
// 治本方案(见交接讨论): 生产端把生成文件写入可写的上传根 ADMIN_UPLOAD_ROOT(/var/www/yiyu-site/uploads),
// 经 Nginx 以 /uploads/ 暴露 —— 既有写权限, 又能被部署 rsync --delete 跳过(uploads 永久保留)。
// 本地 dev: vite 插件仍写 public/ai-generated, 经 dev server 以 /ai-generated 暴露。
//
// ⚠️ 该前端基址需与"生产写盘补丁"配套上线: 生产 admin-ai 写盘目录改到 uploads 后, 此处生产基址才命中。
export const AI_ASSET_BASE = import.meta.env.DEV ? '/ai-generated' : '/uploads/ai-generated';

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');

/** 某篇文章 AI 资产目录的访问 URL 前缀 */
export function aiArticleDir(id: string): string {
  return `${AI_ASSET_BASE}/articles/${safeId(id)}`;
}
