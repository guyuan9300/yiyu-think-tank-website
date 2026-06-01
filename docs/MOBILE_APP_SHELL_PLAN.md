# 移动端 App 化外壳 · 策划方案（底部 Tab 栏）

> 目标：手机访问官网时，**外观与交互像一个原生 App**——底部固定一条 Tab 栏，
> 4 个图标在「首页 / 文章 / 报告 / 益语AI」之间切换。桌面端完全不受影响。
> 本文档为该任务的单一真相源（SSOT），实现与验收都按此推进。

- 创建：2026-06-01
- 分支：`feat/mobile-app-shell-2026-06-01`（已建，基线 138fb0e）
- 状态：**MVP 已实现并自测通过**（commit 40768ce，playwright 验收 16/16）；二期(§4)待定
- 负责线程：本任务独立线程，产出后回 PR

---

## 1. 为什么这件事难度低（架构事实）

| 事实 | 出处 | 含义 |
|---|---|---|
| 路由是**自制状态机**，非 react-router | `src/App.tsx` `currentPage` + `if (currentPage===…)` 分发链 | 切页 = 调一个回调，无需路由配置 |
| 4 个目标页**早已存在**，且就是现在桌面顶导的项 | `Header.tsx` navItems：home/articles/reports/workbench/about | Tab 栏不是做新页面，只是换移动端入口 |
| `onNavigate` 已接受 `'home'/'articles'/'reports'/'workbench'` | `Header.handleNavClick` pageMap + `App.handleNavigate` | Tab 栏复用同一契约，**零新路由逻辑** |
| iOS 安全区类已就绪 | `index.css` `.safe-bottom` = `env(safe-area-inset-bottom)` | 贴底栏的地基已打好 |
| 已用 Tailwind 断点做响应式 | 全站 `hidden md:flex` 等 | 站点本就响应式，本方案只是叠加 App 形态 |

**结论**：最小可行版 ≈ 1 天；想做到「真像 App」的体感（保留各 Tab 滚动位置）再加 1–2 天。无新依赖、不动后端、纯前端。

---

## 2. 四个 Tab 的映射（确定）

| Tab | 图标语义 | `onNavigate` 入参 | 实际页面 | 现有组件 |
|---|---|---|---|---|
| 首页 | home | `'home'` | open-source-home | `OpenSourceHomePage` |
| 文章 | document/news | `'articles'` | article-center | `ArticleCenterPage` |
| 报告 | chart/file | `'reports'` | report-library | `ReportLibraryPage` |
| 益语AI | sparkles/robot | `'workbench'` | workbench | `WorkbenchPage`（益语智库 AI 介绍页） |

> 第 4 个 Tab 文案**已定为「益语AI」**，对应益语智库 AI 介绍页面（`WorkbenchPage`）。

---

## 3. 改动清单（最小可行版 / MVP）

| 文件 | 改动 | 类型 |
|---|---|---|
| `src/lib/useIsMobile.ts` | **新建** ~15 行 hook：`matchMedia('(max-width: 767px)')` + resize 监听。**按屏宽判断，不嗅探 userAgent**（更稳，桌面窄窗也正确） | 新增 |
| `src/components/mobile/MobileTabBar.tsx` | **新建** 底部栏组件：`fixed bottom-0 inset-x-0 z-[60]`、4 个 icon+label 按钮、读 `currentPage` 高亮当前、点击调 `onNavigate`；外层套 `.safe-bottom` 适配 iOS | 新增 |
| `src/App.tsx` | 挂载 `MobileTabBar`：仅当 `isMobile && currentPage ∈ {home, article-center, report-library, workbench}` 时渲染；给这些页面外层加 `pb-[64px]` 底部留白防遮挡 | 改 ~10 行 |
| `src/index.css` | 复用现有 `.safe-bottom`；可加一个 `--mobile-tabbar-h: 64px` 变量统一高度 | 改 ~3 行 |

### 3.1 必须处理的冲突（诚实成本）
现有这些 `fixed bottom-*` 浮动元素会和 Tab 栏叠在一起，**移动端必须上移**：
- `YiyuTongAssistant.tsx:824` 益语通浮球 `bottom-6 right-6`
- `ReportReaderPage.tsx:934` 报告页 AI 浮钮 `bottom-5 right-5`
- `CommunityBoard.tsx:706` 社区浮条 `bottom-8`

处理：移动端把它们的 `bottom` 抬到 `calc(64px + safe-area + 间距)`。约半天调试活。

---

## 4. 不在 MVP 范围（二期再议）

| 进阶项 | 价值 | 成本 | 是否做 |
|---|---|---|---|
| **Tab keep-alive**：切 Tab 保留各页滚动位置（`display:none` 切换而非卸载） | 这是「真像 App」的关键体感；当前状态路由切页会重挂载丢滚动 | 中（唯一有架构含量的块，1–2 天） | 二期，看 MVP 反馈 |
| 移动端专用顶栏（替代桌面 Header） | 更像 App | 小-中 | 二期 |
| 切 Tab 过渡动画 | 锦上添花 | 小 | 二期 |
| Tab 角标/未读红点 | 视产品需要 | 小 | 暂不 |

---

## 5. 显示规则（白名单）

- **显示 Tab 栏**：仅 4 个主页面（home / article-center / report-library / workbench）。
- **不显示**：文章详情、报告阅读页、登录/注册、支付流程、后台（admin/admin-v2）、404、法务页——这些走各自布局或「返回」头。
- 判据：在 App.tsx 渲染分发处，用一个 `MOBILE_TAB_PAGES` 集合判断。

---

## 6. 验收标准

- [ ] iPhone 实机（Safari）竖屏：底栏贴底、不被 home indicator 遮挡、4 图标可切页且高亮正确
- [ ] 安卓 Chrome 竖屏：同上
- [ ] 桌面端（≥768px）：**完全看不到** Tab 栏，零视觉/交互变化
- [ ] 窄窗 resize：跨越 767px 断点时 Tab 栏即时出现/消失，不需刷新
- [ ] 益语通浮球 / 报告页 AI 钮在移动端不再被 Tab 栏压住
- [ ] 4 个主页面最后一屏内容不被底栏遮挡
- [ ] `npx tsc --noEmit` 0 错误
- [ ] 详情/登录/支付/后台页**不**出现 Tab 栏

---

## 7. 任务线程 / 分支策略（待确认后执行）

⚠️ **前置阻塞**：当前分支 `feat/admin-v2-and-page-restyle-2026-05-28` 工作树有
**一整天（5/31）未提交改动**（tracked +6224/−4087、staged 13、untracked 124），且该分支
**从未 push 过 origin**。若现在直接 `checkout -b` 新分支，这些脏改动会一并带过去，
新分支历史不干净、也无从区分两件事的成果。

**建议顺序**：
1. **先保命提交**：把 5/31 的成果在现分支提交落盘（消除丢失风险）——见对话中的提交方案。
2. 基于现分支建 `feat/mobile-app-shell-2026-06-01`（移动外壳本就是包在这批新页面之上，应承接它们）。
3. 在新分支按 §3 实现 MVP → 自测 §6 → 回 PR。

> 是否执行第 1、2 步由顾源源确认。本方案文档（本文件）为 untracked 新增，不影响任何现有改动，可独立先存在。

---

## 8. 一句话给决策者

技术不难，难在细节打磨。**建议先做 MVP（§3）小步上线看手机实感**，keep-alive 等进阶项（§4）等反馈再加，不要一上来追全套原生体感而陷在细节里。
