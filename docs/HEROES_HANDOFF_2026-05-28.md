# 益语智库开源官网 · Hero & Features 演示动画交接

> 起草时间：2026-05-28
> 目的：让下一个 AI 线程能 0 上下文接手 Hero 自动演示舞台 + Features 卡片悬浮窗演示这一摊工作。

---

## 1. 仓库基本信息

| | |
|---|---|
| **本地路径** | `~/openclaw/workspace/yiyu-think-tank-website/` |
| **GitHub** | `https://github.com/guyuan9300/yiyu-think-tank-website.git` |
| **当前分支** | `main` |
| **最后已提交 commit** | `17266dd feat: add open-source workbench showcase page` |
| **当前 Node 版本要求** | v18+（用了 `node:internal/modules` 新 API）|

### Dev server 启动

```bash
cd ~/openclaw/workspace/yiyu-think-tank-website
npm run dev
```

监听 `http://localhost:5173`。

### 入口 URL

```
http://localhost:5173/?page=open-source-home
http://localhost:5173/?page=open-source-home#features
```

路由判断在 `src/App.tsx:782`：`currentPage === 'open-source-home'` → 渲染 `<OpenSourceHomePage />`。

### 软件源仓（V2.1，真实软件代码）

很多组件是从 V2.1 主仓 1:1 搬过来的视觉。需要查源码时去那里：

```
本地：~/openclaw/workspace/yiyu-thinktank-workbench/
GitHub：https://github.com/guyuan9300-max/yiyu-thinktank-workbench
分支：main
```

⚠️ **注意**：早期工作误用了 V2.0 cleanup 分支（`~/yiyu-cleanup-workspace/.../yiyu-cleanup-test-20260511-202524/`），后来才切到 V2.1 主仓。`事实澄清` / `深度思考 chip` / `AI 生成 popover` 等都只在 V2.1 主仓里有源码。

---

## 2. 整个 open-source-home 文件树

```
src/components/open-source-home/
├── OpenSourceHomePage.tsx          ← 顶层页面，按顺序组装 sections
├── OpenSourceNav.tsx               ← 顶部导航（未改）
├── OpenSourceFooter.tsx            ← 页脚（未改）
├── ui.tsx                          ← Section / Container / Reveal / Card / Button 等原子件（未改）
├── links.ts                        ← FUTURE_ROUTES / ANCHORS / PARTICIPATE 等链接配置
│
├── sections/
│   ├── Hero.tsx                    ← 首屏，右栏渲染 <HeroProductDemo />（未改）
│   ├── Manifesto.tsx               ← 宣言（未改）
│   ├── QuoteBand.tsx               ← 引文带（未改）
│   ├── Features.tsx                ⭐ 6 卡能力区，加了 lightbox 触发机制
│   ├── FactClarifyDemo.tsx         ⭐ Card #01 弹窗内容 + Lightbox 容器（同文件 export）
│   ├── SmartEditDemo.tsx           ⭐ Card #02 弹窗内容 + Lightbox 容器
│   ├── Ledger.tsx                  ← 财务公示（仅修了一处类型）
│   ├── CashFlowStatement.tsx
│   ├── Stories.tsx
│   ├── Join.tsx
│   └── FinalCta.tsx
│
├── demo/                            ⭐ Hero 右侧自动演示舞台核心
│   ├── HeroProductDemo.tsx         ← 3 场景自动轮播壳 + 3D 视差 + ambient 层
│   ├── scenes/
│   │   ├── AppShell.tsx            ← 三场景共用的左侧导航 + 底部 SYSTEM 状态
│   │   ├── CalendarScene.tsx       ← 场景 1：任务月历（含 7 客户配色 + 波浪揭示动效）
│   │   ├── WorkspaceScene.tsx      ← 场景 2：客户工作台（含字符波浪打字机 + 文件 3D 扑入）
│   │   └── GrowthScene.tsx         ← 场景 3：成长中心（雷达 + 计数器 + 进度条 + 热力图）
│   └── ported/                     ← 1:1 搬自 V2.1 软件源码的纯函数 / 类型 / SVG
│       ├── AbilityRadar.tsx        ← 1:1 搬自 GrowthCenterView.tsx 第 710 行
│       ├── ReviewMetricGrid.tsx    ← 旧 1:1 搬运（已不再 Hero 使用，留作未来素材）
│       ├── UnderstandingPanel.tsx  ← 同上
│       ├── calendarUtils.ts        ← 1:1 搬自 shared/calendar.ts
│       ├── growthTypes.ts          ← 1:1 搬自 shared/types.ts 成长能力部分
│       └── understandingTypes.ts   ← 1:1 搬自 shared/types.ts 任务理解部分
```

⭐ 标的是核心工作产物。其它要么是项目原有要么是辅助。

---

## 3. 三大场景动效说明（CalendarScene / WorkspaceScene / GrowthScene）

每个场景渲染 **1280×920 原生像素**画布，由 HeroProductDemo 用 `transform: scale(...)` 缩到 Hero 右栏 ~640px 槽位。**字号/间距全用真实软件像素值**，缩放后视觉密度=软件本身。

### CalendarScene（任务月历）

- 视觉外壳：AppShell + 顶部 tab + 月历卡 + 6×7 网格
- 客户配色逻辑 1:1 复刻 V2.1 `TaskCalendarView.tsx` 第 218-241 行 `calendarTaskAccentColor` + `calendarChipStyle`：
  - text = accent
  - bg = `${accent}14`（~8% 透明度）
  - border = `${accent}22`（~13% 透明度）
  - 飞机 / 高铁 / 航班关键词 → 强制翠绿 `#16A34A`
- 客户调色板 1:1 搬自 `App.tsx` 第 980 行 `colorPalette`：`['#888681', '#5B7BFE', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#06B6D4']`
- 86 条样例任务覆盖 5 月全月，每条标客户色
- 动效：单层网格 + 每格 `calTaskReveal 0.5s` 按 `(row+col) * 0.1s` 错位 + 浪峰白光 200% 大子元素 `translate3d(-100% -> 100%)` 对角扫过

### WorkspaceScene（客户工作台）

- 视觉：日慈基金会客户工作台聊天界面，用户紫色气泡 + AI 长文本回复 + 右侧文件面板
- 文案 1:1 转写自截图（用户 prompt + AI 长文本，含 8 处加粗 run）
- 字符波浪动效：每字符独立 `<span>` 用 `animation-delay`，stagger 7ms 形成对角波浪
  - 3D 关键帧：`translate3d(0, 6px, -12px) scale(0.94) → (0, 0, 0) scale(1)` + opacity 0→1
  - 全 GPU 路径，主线程零卡顿
- 文件卡 3D 扑入：4 张文件卡按 0.7s 错位 `rotateX(8°) scale(0.88) translate3d(0, 18px, -50px)` 落入
- 底部输入框 composer 1:1 复刻 V2.1 `App.tsx` 第 19526-19659 行（紫色 5B7BFE 按钮 + 13×13 白方块停止图标）
- 3 个 chip（深度思考 / 完全客观 / 写作风格）按截图重画——V2.1 主仓 grep 零命中，是新功能
- 快捷工具 5 图标用 lucide：Upload / LayoutGrid / Leaf / Sparkles / Link2

### GrowthScene（成长中心）

- AbilityRadar 1:1 搬自 V2.1 `GrowthCenterView.tsx` 第 710-780 行（60 行手写 SVG，无图表库依赖）
- 6 能力行结构按软件 `GROWTH_CSS` 视觉规范重画
- 工作节奏热力图：V2.1 源码 `grep "工作节奏" / "rhythm"` 零命中，按截图自行实现
- 同时发生的动效：
  - 雷达 `growRadarPop` 中心 fade+scale 0.86→1.02→1
  - 6 行能力卡按 0.12s 错位 `growFadeUp`
  - 进度条 `transform: scaleX(0→1)`（不用 width，避免 layout）
  - 热力图按强度排队 fadeIn：intensity 1 起步 0.3s / 2 起步 0.5s / 3 起步 0.75s / 4 起步 1.0s（"从少到多"）
  - 顶部 2,793 XP 用 `useCountUp`（requestAnimationFrame）从 0 平滑算到 2793

---

## 4. HeroProductDemo（自动轮播壳）

`demo/HeroProductDemo.tsx`，约 320 行。

- 3 个 scene 同时挂载，叠在同位置（`absolute inset-0`），只有 active 是 opacity 1
- 切换 cross-fade 0.35s + scale 0.96→1（cubic-bezier 0.34, 1.4, 0.64, 1，弹性回弹）
- `centerCounter` 数组追踪每个 scene 进入 center 的次数，scene 内层 `<div key={s-${i}-${centerCounter[i]}}>` 触发 React remount → CSS 动画重播
- 鼠标视差：active 卡跟随光标 ±5° rotateX/Y，0.35s 软跟随
- ambient 层：
  - 数据网格（32×32px，opacity 7%，radial mask 中心实/边缘虚）
  - 6 个浮动微粒（4px 紫蓝渐变小圆点，10s 周期漂移）
  - active 卡下方紫蓝双色软光晕
- 时间线导航：3 节点 + 渐变连接线，active 节点脉冲发光环

**dwell 时间** = 该 scene 动画时长 + 约 1s 静置（成长中心给了 3s 静置因为动画快）：

| Scene | dwellMs | 拆解 |
|---|---|---|
| Calendar | 3200 | 动画 ~2.1s + 静置 ~1.1s |
| Workspace | 7000 | 字符波浪 ~6s + 静置 ~1s |
| Growth | 4700 | 计数器 + 雷达 + 进度条 + 热力图 ~1.65s + 静置 ~3s |

总轮回 ~15s。

---

## 5. Features 6 卡 + 弹窗演示

`sections/Features.tsx` 第 56 行起 `FEATURES: FeatureEntry[]`。

- 6 卡能力描述，标准布局（数字 + 标题 + 段落 + take 标语）
- 每卡都加了"可点击"三层信号：右上角 ↗ 锚点 / 悬浮 lift + ring 紫化 / focus 环
- **Card #01 + Card #02 触发 lightbox 弹窗**（其它点击跳 `#features` 锚点占位）

### Card #01 → FactClarifyDemo

- `sections/FactClarifyDemo.tsx` 全文件
- 1:1 复刻 V2.1 `GlossaryAttributeReviewSection.tsx` 第 175-423 行视觉
- 6.5 秒动画分镜：
  - t=0-2s 静态展示（金额已展开 + 4 条事实卡同时可见）
  - t=2s "一键采纳" chip 开始 pulse 提示
  - t=3s chip 按下 press 动效
  - t=3.4s 模态弹出（macOS 风格 confirm）
  - t=4.7s 数字倒计时 81→9、72→0、chip badge 同步联动
  - t=6.5s 末态保持 + 右上 ↻ 重播

### Card #02 → SmartEditDemo

- `sections/SmartEditDemo.tsx` 全文件
- AI 生成 popover 视觉 1:1 复刻 V2.1 `RichTextDocumentEditor.tsx` 第 736-890 行
- 顶部加 **6 步导航条**（浅蓝 banner）：框选 → 右键 → 引入文件 → 输入指令 → 点击执行 → 内容自动生成
- 整体节奏放慢 1.5 倍后总时长 ~15.75s
- "拖选"动效用 `clip-path: inset(0 0 100% 0) → (0 0 0 0)` 从上往下扫出蓝底高亮

---

## 6. ⚠️ 当前未提交改动

`git status --short` 显示一大堆 untracked 文件（新建的整个 `open-source-home/` 子树）+ 几个 Modified 文件（`App.tsx`, `Header.tsx`, `tailwind.config.js` 等顶层配置）。

**未 commit 的核心文件**：

- `src/components/open-source-home/` 整个目录都是 untracked
- `src/components/open-source-workbench/` 同上
- `src/App.tsx` 路由分发改了（加 OpenSourceHomePage 入口）
- `src/components/Header.tsx`
- `tailwind.config.js`（加了 os-* color tokens、`fadeIn` / `fadeInUp` 等 keyframes、`shadow-os` / `shadow-os-lg` 等阴影）
- `package.json` / `package-lock.json`

⚠️ **建议下一个线程先用 `git diff` 确认未提交改动**，因为这次会话改了 40 次 file，但都没有 commit。如果你重置仓库，这些工作全没了。

---

## 7. 当前已知问题（截止 2026-05-28 13:30）

### 🐛 用户报告：访问 `?page=open-source-home` 显示空白页

**症状**：URL 能进，但页面渲染为白。

**沙箱诊断（无法到本机 localhost）**：
- `tsc --noEmit` 干净（exit 0）
- `vite build` 在沙箱跑不动（缺 `@rollup/rollup-linux-arm64-gnu` 原生模块，跟用户机器无关）
- 沙箱 curl `http://localhost:5173/` 返回 HTTP 000（沙箱跟用户 localhost 不互通，无法直接验证）

**下一步诊断建议**（让用户做或者下个线程拿到 chrome MCP 后做）：
1. 检查 dev server 终端是否有 Vite ERROR / Failed to compile
2. 浏览器 DevTools Console 看 TypeError / Cannot read / Module not found 等运行时错误
3. 浏览器 Network 看是否有 404 资源
4. 检查最近改的 `HeroProductDemo.tsx` 是否有未导入的符号

**可疑点**：
- 最近一次改动是把 `HeroProductDemo.tsx` 改成 3D 视差版（rev 39 / rev 40），文件大概 300+ 行。CSS 用了 inline `<style>{HERO_CSS}</style>` 注入，应该不会出问题，但 React 严格模式下某些副作用可能重复触发。
- `Ledger.tsx` 第 354 行最近改了 `ref={ref as React.RefObject<HTMLDivElement>}` 类型断言——可能是这次会话之前就坏的，断言之后 tsc 通过了。运行时不应受影响。

### 📋 其他小问题（不阻塞）

- Hero 右栏首次 mount 时 3 个 scene 同时挂载，会同时触发 3 套入场动画（Workspace 字符波浪、Calendar 任务揭示、Growth 计数器）。视觉上密集但 1 秒后都各自归零静止，不影响后续轮转。
- 旧的 `UnderstandingPanel.tsx` + `ReviewMetricGrid.tsx` 在 `ported/` 下是孤立文件（之前 Hero 用过现在没用），留着备用，但 dead code。

---

## 8. 关键技术决策（避免重做）

| 决策 | 原因 |
|---|---|
| **全 GPU 路径**：所有动效用 `transform` + `opacity`，不用 `width` / `mask-image` 关键帧 | 试过 `mask-image: linear-gradient(...)` 关键帧插值，Safari 在大面积 mask 上掉到 ~30fps。改成 `transform: translate3d` 后 60fps |
| **`requestAnimationFrame` 而非 setInterval** 驱动计数器 / 字符波浪 | 计数器要平滑（不是阶跃）；setInterval 在浏览器 throttling 下不稳 |
| **scene `key` 用 `centerCounter` 强制 remount** | CSS animation 在 React 重渲染时不会重播，必须 remount。用 key 是 React 标准做法 |
| **`absolute inset-0` 三 scene 叠加 + opacity 切换** 而非 horizontal slider | 单卡视图最干净，但保留 3 scene 挂载用于 remount 重播。用过 horizontal slider / 对角飞越 / 3D Cover Flow，最后用户拍板"只显示当前那张" |
| **Card #01/02 用 lightbox 弹窗** 而非内嵌 customBody | 用户拒绝把卡片高度撑爆，弹窗能给完整景深 |

---

## 9. 下一个线程接手时的建议起点

1. **先 `git diff` 看未 commit 改动量** —— 知道动了多少
2. **优先修空白页问题** —— 用户卡在这里，没法验证
3. 如果 chrome MCP 能连：直接 `tabs_create_mcp` + `navigate` 到 `http://localhost:5173/?page=open-source-home`，看 console 报错
4. 如果 chrome MCP 不能连：让用户复制 Vite 终端的错误 + 浏览器 Console 的错误给你

任务进度总览见 `TaskList`，编号 1-41 都已完成，#41 是空白页调查中断。

---

## 10. 跟用户沟通的几个偏好

- 用户中文沟通，技术术语保持英文
- 不喜欢"通用"/"经典" SaaS 设计（曾否定 Apple TV 简版 + Hero Slider 缩略图条方案，要"有科技含量"）
- 偏好"软件原代码 1:1 搬运" > "按截图重画" > "自己造"。这三种性质要在代码注释里如实标明，**不能假装搬运实际重画**
- 接受"按截图重画"的前提是 V2.1 源码确实没有（grep 零命中），且要在代码注释里如实标明
- 不喜欢冗长文字解释，喜欢直接动手 + 简洁报告

结束。
