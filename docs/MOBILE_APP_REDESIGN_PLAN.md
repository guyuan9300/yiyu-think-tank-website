# 移动端 App 化全面重排 · 设计语言与落地方案

> 目标：手机端**看起来像一个 App，不像网页**。桌面端完全不动；移动端走专属 app-native 屏幕。
> 本文档为单一真相源（SSOT）。先定设计语言（已锚定首页），再逐屏铺开。

- 创建：2026-06-01
- 分支：`feat/mobile-app-shell-2026-06-01`
- 状态：**首页样板屏已实现**（设计语言锚点）；文章/报告/益语AI 三屏待铺开

---

## 1. 原则：App ≠ 把网页塞进手机

桌面响应式塌成单列后，**横向相邻所编码的"这是一组 N 个平级项"信息丢了**，用户竖刷很久不知结构、容易累。App 化要按"小屏 / 单手 / 注意力线性"重排信息架构，而非调断点。

| 网页做法（弃） | App 做法（用） |
|---|---|
| 一排 N 卡 → 塌成竖列 | **横滑 shelf**（snap 卡片，保住"一组 N 个"） |
| 长 section 顺序硬堆 | 仪表卡 / 折叠 / 列表行，**信息密度提高、总长缩短** |
| 全宽 web hero | **内容卡式 hero**（圆角、有边界、紧凑） |
| 平级内容并列 | 列表行 + chevron，点开进详情 / bottom-sheet |
| 每段桌面 section 都保留 | **筛减合并**：不是每段都配得上一屏 |

## 2. 架构（桌面零影响）

- `useIsMobile()`：屏宽 <768px 判定。
- `App.tsx`：`isMobile ? <Mobile*Screen/> : <桌面页>`，逐 tab 页切换；桌面分支原样不动。
- `src/components/mobile/MobileAppShell.tsx`：**共用 App 外壳**——吸顶细顶栏（品牌 + 语言/登录）+ 滚动内容区。4 屏共用。
- `src/components/mobile/screens/Mobile*Screen.tsx`：每个 tab 一个专属屏。
- 底部 Tab 栏 `MobileTabBar`（首页/文章/报告/益语AI）已就绪，独立挂载。

## 3. 设计语言（首页已锚定，全站复用）

- **品牌色**：os-navy `#16265E`（主）/ os-canvas `#F7F8FC`（底）/ os-blue / os-violet（点缀）/ os-mist（浅块）。
- **字体**：标题 `.font-serif-display`（衬线宋体，编辑式高级感）；正文 Inter sans。
- **形状**：卡片 `rounded-2xl/3xl` + `ring-1 ring-os-line` + 柔阴影；按钮 `rounded-full`，`active:scale` 触感反馈。
- **动效**：入场 `animate-fade-in-up` + `animationDelay` 阶梯（0 / .08 / .16 / .24 / .32s）。
- **组件模式库**（首页已实现，可直接复用）：
  1. **英雄卡** HeroCard：藏蓝渐变 + 大衬线标题 + 双 CTA。
  2. **横滑 shelf**：`overflow-x-auto snap-x .scrollbar-none`，卡宽 ~62%。
  3. **仪表卡** StatCard：2×2 stat tiles + "查看完整 →"。
  4. **列表行** ListRow：icon + 标题 + 1 行摘要 + chevron，`divide-y`。
  5. **金句** QuoteCard：居中衬线。

## 4. 逐屏铺开计划

| 屏 | currentPage | 桌面来源 | App 化要点 |
|---|---|---|---|
| ✅ 首页 | open-source-home | OpenSourceHomePage | 英雄卡 + 能力 shelf + 总账卡 + 参与列表 + 金句（**已实现**） |
| ⬜ 文章 | article-center | ArticleCenterPage | 顶部分类 chips（横滑）+ 精简单行文章卡列表（图+标题+1行摘要）；砍桌面 3 列网格 |
| ⬜ 报告 | report-library | ReportLibraryPage | 精选报告大卡 shelf + 报告列表行；进详情走已有 ReportReaderPage |
| ⬜ 益语AI | workbench | WorkbenchPage | 能力分组卡 + 功能 shelf；突出"下载/申请内测"主 CTA |

详情/登录/支付等非 tab 页暂保持响应式（不在本轮）。

## 5. 待办 & 验收

- [ ] 文章 / 报告 / 益语AI 三屏按 §3 模式库实现
- [ ] 数据接真：首页总账 StatCard 当前为展示占位，铺开时接 Ledger 真实数据源
- [ ] 真机验收：iPhone Safari 安全区不遮挡、横滑顺手、触感反馈
- [ ] 每屏 `tsc --noEmit` 0 错误；桌面端不受影响

## 6. 一句话

设计语言已由首页锚定（HeroCard / shelf / StatCard / ListRow / QuoteCard 五件套）。后续三屏是"套用同一套模式库 + 各自真实内容"，不是重新设计。
