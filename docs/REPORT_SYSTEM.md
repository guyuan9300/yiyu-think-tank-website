# 报告系统 · 落地策略与交接文档

> 目标：报告详情页前后台系统性升级——以「离线生成的 Markdown 解读文档」为内容底座，
> 实现 ① 在线阅读（简介/目录/正文）② 前 20% 试读触发会员付费 ③ 简介自动提炼
> ④ 跟 AI 聊报告内容 ⑤ 后台上传报告 PDF + 解读 Markdown。
> 本文档为单一真相源，后续接云、加报告都按此推进。

最后更新：2026-05-31

---

## 1. 核心设计：为什么用 Markdown 解读文档

报告本质是 **PDF 文档**（数据模型只有 `fileUrl` + `summary`，无正文）。直接在前台用大模型解析 PDF：成本高、表格图片易丢、质量不稳。

**采用的路径**：上传报告时，同时上传一份**离线大模型生成的 Markdown 解读稿**（本地一次性，几乎零成本、可人工校对）。前台据此渲染简介/目录/正文，并作为 AI 问答的 grounding 上下文。PDF 退回成「下载原件」。

> **2026-05-31 策略定稿**：彻底放弃在页面内嵌 PDF 预览（`<object>` 体验差、不响应式、割裂设计）。
> **页面只呈现萃取出的文字（Markdown）**，PDF 仅作「下载原件」。这是麦肯锡/Stratechery 等内容站的主流做法，体验更好、代码更简单。图表靠 MD 里的表格 + 必要时 `![](图URL)` 内嵌补齐。

```
PDF 原件 ──下载──────────────► 用户
  │
  └─(离线大模型解读)─► Markdown 解读稿 ─┬─► 简介卡 (frontmatter.summary / 速览 / 首段)
                                        ├─► 左侧目录 TOC (## / ###)
                                        ├─► 正文渲染 (含 GFM 表格) + 前 20% 试读墙
                                        └─► AI 问答上下文 (豆包大模型, 只依据报告内容作答)
```

---

## 2. 数据模型

`Report`（`src/lib/dataService.ts`）新增两个可选字段：

| 字段 | 含义 |
|---|---|
| `markdownContent?: string` | 报告解读 Markdown 正文（内联存储，localStorage / 后端） |
| `markdownUrl?: string` | 或指向 `.md` 文件的 URL（与 content 二选一，**content 优先**） |

`fileUrl` 仍为 PDF 原件（下载用）。`migrateList` 用 `...rest` 透传，新字段不会被丢。

**内置样例**：`SET_INDEX_SEED_REPORT`（id `set-index-2024`），`getReports()` 在 localStorage 无此 id 时自动补上，保证报告库/阅读页开箱可见。文件位于 `public/reports/set-index-2024.{pdf,md}`。

---

## 3. 涉及的文件（排查清单）

| 文件 | 角色 |
|---|---|
| `src/lib/reportMarkdown.tsx` | **零依赖 Markdown 引擎**：frontmatter 解析 / TOC 提取 / 简介提取 / 块级渲染(标题/段落/列表/GFM 表格/引用/分隔线/行内) / `markdownForAi` 截断 / `renderMarkdown(body,{ratio})` 试读截断 |
| `src/lib/reportChat.ts` | AI 问答：`askReportAI()` → `POST /api/admin/ai/chat/completions`（OpenAI 兼容，vite proxy 直连火山方舟豆包），以 Markdown 作 system 上下文 + 防编造提示 |
| `src/lib/dataService.ts` | `Report` 字段、`SET_INDEX_SEED_REPORT`、`getReports()` 合并种子 |
| `src/lib/accessControl.ts` | `resolveReportAccess()`：未登录=locked / 登录未付费=preview(ratio 0.2) / 付费=full（**试读比例的单一真相源**） |
| `src/components/ReportReaderPage.tsx` | 阅读页：os-* 设计；Markdown 阅读区(目录+正文+20%墙) 或 PDF 回退；收藏★/下载 icon；AI 聊天滑出面板 |
| `src/components/admin-v2/AdminV2Modules.tsx` | `ReportsManagement` + `ReportEditModal`（新增/编辑：标题/机构/标签/状态/简介 + PDF 路径 + Markdown 粘贴/上传 .md） |
| `src/components/ReportLibraryPage.tsx` | 报告库列表，`onNavigateToDetail('report', id)` → 阅读页 |
| `public/reports/` | PDF + .md 文件目录 |
| `docs/REPORT_MD_TEMPLATE.md` | 报告解读 Markdown 标准模板 |

> 已清理：ReportReaderPage 旧「智能助手」死代码（activeTab/favorites/feedback/handleBookmark/handleCopy/handleSubmitFeedback）+ 未用图标导入。

---

## 4. 前台行为（按身份）

| 身份 | 阅读 | 下载 | AI 问答 |
|---|---|---|---|
| 未登录(locked) | 整页模糊 + 登录/注册引导 | — | — |
| 登录未付费(preview) | **速览(简介) + 完整目录 + 第一个章节正文**，之后底部渐隐 + 「成为终身会员」墙 | 提示需会员 | 可用 |
| 付费会员(full) | 全文 + 目录 | 下载 PDF（计数 +1，新标签页打开） | 可用 |

**试读墙改为「章节式」而非百分比**（2026-05-31）：`renderMarkdown(body, { previewSections: 1 })` 渲染「开篇 + 第 1 个 `##` 章节」后在章节边界整齐截断；左侧目录始终展示**完整结构**，让免费用户知道整份报告讲什么。比按 20% 块数切更整齐、转化更好。
> 注：`accessControl.resolveReportAccess` 仍返回 `preview.ratio=0.2`，但报告阅读已不使用该比例（改用 previewSections）；ratio 仅文章侧仍可能用。

「跟 AI 聊聊这份报告」右侧滑出面板：把 Markdown 全文喂豆包，模型只依据报告内容回答，底部有「可能有误，以原报告为准」提示。

---

## 5. 如何新增一份报告（运营 SOP）

1. 用本地大模型把 PDF 读成 Markdown，按 `docs/REPORT_MD_TEMPLATE.md` 的结构（**带 frontmatter**）。
2. 把 PDF 放到 `public/reports/`（如 `xxx.pdf`）。
3. 后台 `?page=admin-v2` → 报告管理，二选一：
   - **单篇**：新增报告 → 填标题/机构/日期/标签/状态（简介可留空，自动从 MD 提炼）→ PDF 路径填 `/reports/xxx.pdf` → 报告解读 Markdown 粘贴或上传 .md。
   - **批量**：「批量上传 MD」→ 选/拖入多份 `.md` → 按各自 frontmatter 自动建/更新报告，PDF 按**同名约定**关联（`xxx.md` ↔ `/reports/xxx.pdf`），文件名作报告 id（同名重传=更新）。
4. 保存 → 前台报告库/阅读页立即可见、可读、可问 AI。

> **命名约定（批量上传依赖）**：`.md` 文件名（去扩展名）= 报告 id = 对应 PDF 的基名。例：`set-index-2024.md` ↔ `/reports/set-index-2024.pdf`。

---

## 6. 上云收尾（待网络稳定）

当前为本地链路，三处对接云后即生产可用，**前台组件无需改动**：

1. **AI 端点**：`reportChat.ts` 的 `ENDPOINT` 现为 `/api/admin/ai/chat/completions`（vite dev proxy → 火山方舟，key 由 `.env.local` 的 `ARK_API_KEY` 注入）。上线改成 cloud_backend 的同形端点（建议加按报告/会员的限流与鉴权，避免公开滥用）。
2. **文件存储**：PDF/MD 现放 `public/reports/`。上云改为对象存储（火山 TOS），后台表单的「上传」接对象存储 API，回填 `fileUrl`/`markdownUrl`。
3. **报告数据**：现为 localStorage + 内置种子。上云走 cloud_backend 报告表（`markdownContent`/`markdownUrl` 入库），后台写、前台读。

### 已知后续优化（非阻塞）
- 超长报告（超模型上下文）→ 分块 + 向量检索（RAG）；当前「整篇塞入」对单份报告足够。
- 试读 20% 文案目前写死「前 20%」，与 `accessControl` 的 0.2 对应；若调比例需同步文案。
- 报告库/首页推荐位可读 `showOnHome` 做精选。
