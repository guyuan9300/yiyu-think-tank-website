# 发版与反馈控制台 · 交接说明（给软件侧打通用）

> 状态：**前端页面已完成（纯 mock，不接数据）**，等软件侧（cloud_backend）按本文「数据契约」实现 API + 建表后接通。
> 日期：2026-05-30

---

## 一、仓库地址与入口

| 项 | 值 |
|---|---|
| 仓库 | `https://github.com/guyuan9300/yiyu-think-tank-website.git` |
| 分支 | `feat/admin-v2-and-page-restyle-2026-05-28` |
| 本地路径 | `~/openclaw/workspace/yiyu-think-tank-website/` |
| 页面入口 | `?page=admin-v2` → 左侧菜单「发版与反馈」分组（开发期 DEV 免登；生产走 `AdminAccessGate` + 后端 `adminRole`） |

**模块文件**：
- `src/components/admin-v2/ReleaseConsoleModules.tsx` —— 7 个页面全部实现（核心文件）
- `src/components/admin-v2/AdminV2Shell.tsx` —— 左侧菜单注册（`AdminV2ModuleId` union + `ADMIN_V2_MODULES` 数组，新增「发版与反馈」分组 7 项）
- `src/components/admin-v2/AdminV2Page.tsx` —— 路由分发（switch 7 个 case）

> 当前所有数据是页内 mock 常量，所有按钮 onClick 仅 `console.log('[release-console]', ...)`，表单不真保存。接数据时把 mock 替换为调用下方 API 即可，UI 不用动。

---

## 二、7 个功能界面

| 模块 ID | 菜单名 | 功能 |
|---|---|---|
| `release-overview` | 当前版本 | KPI（正式/测试版本、待处理反馈、覆盖组织数）+ 各平台当前版本卡 + 最近发版活动时间线 |
| `release-versions` | 版本管理 | 版本列表（版本号/状态/平台/强制/发布时间/摘要）+ 编辑抽屉：平台多选、强制更新/灰度开关、**更新内容（用户说明 vs 内部说明两套）**、截图上传位 |
| `release-targeting` ★ | 定向推送 | **多租户组织定向**：选推送版本 → 组织表（组织名/**唯一组织代码**/安装数/当前版本/已指派/范围）→ 逐行勾选 + 全选 + 批量条（推送给所选 / 设为灰度）+ 单行 指派/暂停/回滚 |
| `release-feedback` | 用户反馈 | 收件箱（类型/严重/标题/组织/版本/页面/状态）+ 状态筛选 + 详情抽屉（**自动采集上下文** + 关联任务/并入问题池 + 8 态状态机流转） |
| `release-downloads` | 安装包 | 各平台包（文件名/大小/SHA256/下载URL/上下架/历史） |
| `release-checklist` | 发版检查 | 发版前勾选清单，全过才解锁「确认允许发版」（Release Readiness Gate） |
| `release-website` | 官网同步 | 公开下载页 + 更新日志预览（派生自同一条 release 记录）+「同步到官网」 |

---

## 三、数据契约（软件侧需实现）

### 核心模型：动态定向 + 静态交付
每个组织有唯一**组织代码**；客户端凭组织代码向 cloud_backend 解析「我该装哪个版本」。**定向决策动态**（改指派即时生效），**二进制走静态 TOS**（云端抖动不影响下载）。「内部 / 灰度 / 全量」= 定向的三种 `target_type`。

### 5 张新表（建议加进 cloud_backend `db.py` 的 `_init_schema`，`CREATE TABLE IF NOT EXISTS`，重启自动建；范式同 `organizations`/`employee_accounts`）

| 表 | 服务页面 | 关键字段 |
|---|---|---|
| `releases` | 版本管理 | `id, version, status(draft/testing/published/rolled_back), platforms, mandatory, user_notes(json:新增/修复/优化/已知/下一步), internal_notes, screenshots(json), created_by, created_at, updated_at, published_at` |
| `release_packages` | 安装包 | `id, release_id(FK), platform, file_name, size_bytes, sha512, download_url, blockmap_url, downloadable, published_at` |
| `release_assignments` ★ | 定向推送 | `id, release_id(FK), target_type(all/org/group), org_code, rollout_pct, mandatory, status(active/paused/rolled_back), created_by, created_at, updated_at` |
| `feedback_items` | 用户反馈 | `id, kind(bug/lag/inaccurate/feature/experience), severity(blocker/impaired/minor), title, description, submitter_user_id(FK employee_accounts), org_code, version, page, os, screenshot_url, log_excerpt, status(8态), dup_of(FK self), linked_task_id, linked_release_id(FK), created_at, updated_at` |
| `release_problem_links` | 发版问题池 | `PRIMARY KEY(release_id, feedback_id)` 多对多 |

外键：`organization`→现有 `organizations` 表；提交人→现有 `employee_accounts.id`；客户→现有 `clients.id`。**无需新建身份表。**

### API 端点（建议新建 `cloud_backend/app/routes_releases.py`，`register_release_routes(app, state)`，在 `create_app()` 的 `return app` 前调用，**不要堆进 873KB 的 main.py**）

管理侧（鉴权用现有 `_require_admin`，即 `primary_role=='admin'`）：
- `GET/POST /api/v1/admin/releases`、`PATCH /api/v1/admin/releases/{id}` —— 版本 CRUD
- `GET/POST /api/v1/admin/releases/{id}/assignments`、`PATCH .../assignments/{id}` —— 定向指派 / 暂停 / 回滚
- `POST /api/v1/admin/releases/{id}/packages` —— 安装包元数据回写（由 `publish-to-tos.mjs` 上传后调用）
- `GET /api/v1/admin/feedback`、`PATCH /api/v1/admin/feedback/{id}` —— 收件箱列表 / 状态流转 / 合并去重

客户端侧：
- `POST /api/v1/feedback`（`_require_auth`）—— 桌面 app「报错/提建议」提交，自动带 org_code/version/page/os/截图/日志
- `GET /api/v1/updates/{org_code}/{platform}/latest-mac.yml` —— **org 感知更新解析**：查该组织被指派的 release（无指派→默认全量），返回/302 重定向到 TOS 静态包
- `GET /api/v1/releases/latest?platform=mac` —— 官网公开下载页派生用

### 鉴权与通信复用（桌面侧）
- 桌面调云端走现成 `cloud_request()`（自动带 token + 401 刷新 + 熔断），token 存 db settings。
- 官网 admin 走现成 `POST /api/v1/auth/login` 拿 admin token，Bearer 调用。

---

## 四、两个默认决策（如需更改请告知）

1. **组织代码 = 规范化现有 `organizations.slug`**（加唯一约束），不新增冗余列。
2. **定向包按「同产品不同版本、非机密」处理** → 公开 per-org feed 目录，更新解析端点免鉴权。若将来有「某组织专属功能」才需预签名鉴权。

---

## 五、上线前唯一硬阻塞

cloud_backend 的 CORS（`cloud_backend/app/main.py` 的 `allow_origins`）**当前不放行官网生产域名**，必须加入（建议改成读 env 的可配置列表）。否则官网 admin 调云端 API 跨域失败。

部署：cloud_backend 走 `rsync` 到火山云（`ssh root@101.126.34.232`，真 DB `/var/lib/yiyu-cloud/cloud.db`），不发 DB，新表靠重启 `_init_schema` 自动建。
