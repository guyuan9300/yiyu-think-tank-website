# 修复：文章 AI 封面/插图生成 EACCES（治本 · 写入 uploads）

> 现象：后台批量生成文章封面，全部 `EACCES: permission denied, mkdir '/var/www/yiyu-site/ai-generated/articles'`。
> 根因：生成器把图片写进**静态 webroot**（无写权限的目录），且该目录会被部署 `rsync --delete` 清掉。
> 治本：改写到**可写、且部署保留**的上传根 `ADMIN_UPLOAD_ROOT(/var/www/yiyu-site/uploads)`，经 Nginx `/uploads/` 暴露。与现有 ai-covers/ai-imports/ai-pages 写法一致。

最后更新：2026-06-02

---

## 改动分三处，必须配套上线

### ① 前端读取基址（已在本仓库改好）
- 新增 `src/lib/aiAssets.ts`：`AI_ASSET_BASE = DEV ? '/ai-generated' : '/uploads/ai-generated'`
- `ArticleCenterPage` / `ArticleDetailPage` 改用 `aiArticleDir(id)` 拼封面/插图 URL（不再硬编码 `/ai-generated`）
- 生产构建后，封面图请求落到 `/uploads/ai-generated/articles/{id}/cover.jpg`

### ② 生产写盘目录（**需在真实生产源 `pg-auth-api` / admin-ai 处理器上改**，本仓库克隆里无此服务端代码）
找到文章 AI 生成器里这两处常量（与本地 `vite-plugin-admin-ai.mjs` 同构，生产版基于 `SITE_PUBLIC_ROOT`）：

```js
// 改前（写进 webroot，无权限）
const OUT_DIR  = path.join(SITE_PUBLIC_ROOT, 'ai-generated', 'articles');     // /var/www/yiyu-site/ai-generated/articles
const MANIFEST = path.join(SITE_PUBLIC_ROOT, 'ai-generated', 'manifest.json');

// 改后（写进可写的上传根）
const OUT_DIR  = path.join(ADMIN_UPLOAD_ROOT, 'ai-generated', 'articles');    // /var/www/yiyu-site/uploads/ai-generated/articles
const MANIFEST = path.join(ADMIN_UPLOAD_ROOT, 'ai-generated', 'manifest.json');
```

- `/api/admin-ai/manifest` 端点读的就是上面的 `MANIFEST` 文件，改了常量即自动指向新路径，端点本身不用动。
- manifest 内仍只存 `filename`（封面/插图文件名），URL 由前端用 `AI_ASSET_BASE` 拼——所以**服务端无需在 manifest 里写绝对 URL**，两边自然对齐。
- 其余生成逻辑（prompt、下载图片、写 manifest）不变，只是落点从 webroot 换到 uploads。

### ③ Nginx
`/uploads/` 已经在服务（ai-covers 等都走它），**无需新增配置**。确认 `location /uploads/` 指向 `ADMIN_UPLOAD_ROOT`。

---

## 上线步骤（在有 SSH 钥匙的部署机执行）

1. **迁移已有产物**（把旧 webroot 下的生成图搬到 uploads，避免历史封面 404）：
   ```bash
   sudo mkdir -p /var/www/yiyu-site/uploads/ai-generated
   sudo rsync -a /var/www/yiyu-site/ai-generated/ /var/www/yiyu-site/uploads/ai-generated/ 2>/dev/null || true
   sudo chown -R <auth-api 服务用户>:<组> /var/www/yiyu-site/uploads/ai-generated
   ```
2. 应用 ② 的 `pg-auth-api` 改动 → `node --check` → 备份原文件 → 替换 → `systemctl restart yiyu-auth-api` → `curl /healthz`。
3. 部署前端（含 ① 的改动）：`build:ip` → 安全扫描 → 备份 webroot → rsync → 冒烟。
4. 后台重新生成 1 篇文章封面验证：返回的应是 `/uploads/ai-generated/articles/...`，且 `mkdir` 不再 EACCES，前台文章卡封面正常显示。

## 为什么这样能根治
- **写权限**：uploads 本就是服务进程可写（ai-covers 等已在用）。
- **部署不丢**：交接文档明确 rsync「保留 uploads 和 ai-generated」；放进 uploads 后 `--delete` 不会清掉，权限也不会被 webroot 的 chown 重置。

## 重要提醒（与整体上线相关）
本仓库 openclaw 克隆的 `scripts/pg-auth-api.mjs` **不含 admin-ai 文章处理器**（该能力仅在本地 `vite-plugin-admin-ai.mjs`）。说明**线上跑的服务端源与本克隆不一致**——② 必须打到真正的生产 `pg-auth-api`/Documents 源上。这也意味着：若直接拿本克隆分支整体覆盖上线，会**丢失线上已有的 admin-ai 服务端能力**，需先对齐服务端源。
