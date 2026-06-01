# 开源官网首页 · 协作上手文档（给一起做网页的新线程）

> 你将和 D 线程一起做"益语智库开源官网首页"。先把这份读完再动手。
> 最后同步：2026-05-26（由 D 线程维护）

---

## 0. 一句话

我们在做的是**益语智库开源官网首页**——一个"行动者生态"宣言页。顾源源会发**设计示意图（PNG）**，我们按图 **1:1 还原**，配色统一走**深蓝 + 紫**品牌风格，做得克制、高级。

---

## 1. 仓库与启动（看清楚：是独立官网仓库，不是软件主仓库）

- 仓库：`~/openclaw/workspace/yiyu-think-tank-website/`（**独立 git**，不是 `yiyu-thinktank-workbench`/V2.1，别去那边改）
- 技术栈：React 18 + TS + Vite 5 + TailwindCSS 3 + lucide-react；自研 `?page=` 路由（无路由库）
- 启动：`npm run dev` → dev server 一般已在 **http://localhost:5173/** 跑着（D 已开，HMR 共用，别重复开多个）
- **目标页地址**：`http://localhost:5173/?page=open-source-home`
- 类型检查（每次改完必跑）：`npx tsc --noEmit`（必须 0 error）
- 生产构建：`VITE_BASE=/ npx vite build`

---

## 2. 这页在哪 / 文件结构

- 路由注册在 `src/App.tsx`：`ALLOWED_PAGES` 里有 `open-source-home`，分支 `if (currentPage === 'open-source-home') return <OpenSourceHomePage .../>`
- 主站 `src/components/Header.tsx` 已加导航标签「益语智库智能平台」→ 指向本页；本页**用主站 Header**（不是自带导航）
- 页面代码全在 `src/components/open-source-home/`：

| 文件 | 作用 |
|---|---|
| `OpenSourceHomePage.tsx` | 组装：主站 Header + 各 section + Footer + 全局噪点叠层 + SEO title |
| `ui.tsx` | **设计系统原子件**：Container / Section / SectionHeading / Card / Badge / Button / Reveal（先读这个） |
| `links.ts` | 集中链接配置（live / placeholder 状态） |
| `OpenSourceFooter.tsx` | 深蓝页脚（5 组链接 + 组织身份说明） |
| `OpenSourceNav.tsx` | **已弃用**（页面改用主站 Header，别再用它） |
| `sections/Hero.tsx` | 首屏：左文案 + 右产品图 `public/images/open-source/hero-product.png` + 平台下载 chip + 金句 |
| `sections/Manifesto.tsx` | 行动者启示（4 卡 2×2） |
| `sections/QuoteBand.tsx` | 深蓝金句暗场带 |
| `sections/Features.tsx` | 功能模块（6 卡 3×2） |
| `sections/Ledger.tsx` | 开放账本数据卡（4 卡）**⚠️ 数字是占位** |
| `sections/Stories.tsx` | 行动者故事（4 卡，错位排版） |
| `sections/Join.tsx` | 加入我们（5 入口 + 透明看板，看板只给状态不给假数字） |
| `sections/FinalCta.tsx` | 深蓝收尾转化区（下载入口标"内测准备中"） |

---

## 3. 设计系统（务必沿用，不要另起一套）

**调色板**：定义在 `tailwind.config.js` 的 `os.*`（改这里全站级联）。取自 logo 渐变深蓝 + 品牌紫：
- `os.navy #16265E`（标题/页脚/主按钮）· `os.navy-700 #21357F`
- `os.blue #2C6FD0`（链接/图标/交互）· `os.indigo #4F46E5`（渐变桥）· `os.violet #7C3AED`（强调/加电）
- `os.canvas #F7F8FC`（冷白底）· `os.paper #FFF` · `os.mist #ECEFFB`（浅靛）· lavender 段底 `#F3F3FC`
- `os.spark #7C3AED` / `os.spark-soft #EDE7FB`（=紫，原橙已弃）
- `os.ink #1A2235`（正文标题）· `os.muted #5A6178`（次要）· `os.line #E3E6F1`（发丝线）
- 轻阴影：`shadow-os` / `shadow-os-lg`（阴影要轻）

**字体**：大标题用衬线 `.font-serif-display`（Noto Serif SC，已在 index.html 引）；正文/卡片标题用无衬线。
**渐变字**：`.text-ink-accent`（深蓝→靛→紫，logo 同源），用在 Hero "一份礼物"。
**Section 色调**：`<Section tone="canvas|paper|mist|navy|lavender">`。

**风格原则**：克制、留白足、卡片圆角 20px、发丝边框、低阴影；深蓝+紫为主，绿/橙只在开放账本做数据区分用（低饱和）。不要科技蓝紫霓虹、不要重投影、不要普通 SaaS 销售腔。

---

## 4. 当前版块顺序 + 明暗节奏（重要：别破坏交替）

`OpenSourceHomePage.tsx` 里顺序与 tone：

1. Hero — 淡紫渐变
2. Manifesto 行动者启示 — **canvas**
3. QuoteBand 金句暗场 — **navy（深）**
4. Features 功能模块 — **lavender**
5. Ledger 开放账本 — **canvas**
6. Stories 行动者故事 — **lavender**（卡片错位 masonry）
7. Join 加入我们 — **canvas**
8. FinalCta — **navy（深）** → Footer navy

节奏 = 冷白 ↔ 淡紫交替 + 两段深蓝重音。**新增/改动版块时保持这个交替**，别连着两个同色。

---

## 5. 怎么干活（D 的工作流，照着来体验一致）

1. 顾源源发设计图 → **1:1 还原**版面与文案，配色换成上面的 os 调色板。
2. 改 `tailwind.config.js` 的 token 会**全站级联**；改完 **tailwind config 必须重启 dev server**（HMR 不重读 config）。改组件则 HMR 直接生效。
3. 每次改完：`npx tsc --noEmit` 必须过 → 用 Playwright 截图自检（脚本写在**仓库目录内**才能 import playwright；截 `localhost:5173/?page=open-source-home`）。
4. 给顾源源看的长图存到 `~/Desktop/开源网页制作/`。
5. 换了同名图片资源（如 hero-product.png）要提醒顾源源**硬刷新 Cmd+Shift+R**（缓存）。
6. 检查移动端无横向滚动（`document.documentElement.scrollWidth > innerWidth`）。

---

## 6. 红线（别踩）

- **ANTI_FAKE**：对外不写虚构数字。`Ledger.tsx` 里所有财务/人次都是**占位示例**，已在代码注释标明，上线前必须换真数或隐藏；Join 的透明看板坚持只给状态（首批招募中/内测中…）不给假数。
- 不碰其它仓库（V2.1/workbench 软件是 A/B/C/E 的地盘）。
- 不写"AI 替代人 / AI CEO 已上线 / Codex·Claude Code 已接入"这类未确认能力；保留"人类负责判断与确认"边界。
- 不引新 UI 框架（沿用 Tailwind + lucide）。

---

## 7. 协作分工（防止两个 AI 改同一文件冲突）

官网是独立仓库、没有 V2.1 那套 baton。我们靠下面这张**文件认领表**：**动某个文件前，把状态改成 `占用中(你)`，commit/做完改回 `空闲`。** 尽量按 section 文件分工，不要同时改 `ui.tsx` / `OpenSourceHomePage.tsx` / `tailwind.config.js` 这几个公共文件。

| 文件 | 状态 | 说明 |
|---|---|---|
| ui.tsx / tailwind.config.js / index.css | 空闲（公共，改前先吼一声） | 调色板/原子件，影响全站 |
| OpenSourceHomePage.tsx | 空闲（公共，改前先吼一声） | 版块顺序/组装 |
| Header.tsx / App.tsx（主站） | 空闲 | 路由/导航 |
| sections/Hero.tsx | 空闲 | |
| sections/Manifesto.tsx | 空闲 | |
| sections/QuoteBand.tsx | 空闲 | |
| sections/Features.tsx | 空闲 | |
| sections/Ledger.tsx | 空闲 | |
| sections/Stories.tsx | 空闲 | |
| sections/Join.tsx | 空闲 | |
| sections/FinalCta.tsx / OpenSourceFooter.tsx | 空闲 | |

> 建议：新线程接**新版块 / 指定 section**，D 接另一部分；公共文件（ui/tailwind/compose）改动先在这里认领或互相说一声，避免互相覆盖。任务都听顾源源，不要自己加。

---

## 8. 第一次开工 checklist

1. `cat docs/OPEN_SOURCE_HOME_HANDOFF.md`（本文件）
2. 打开 `http://localhost:5173/?page=open-source-home` 看现状
3. 读 `ui.tsx`（设计系统）+ `OpenSourceHomePage.tsx`（结构）
4. 在第 7 节认领你要改的文件
5. 改完 `npx tsc --noEmit` + Playwright 截图自检
6. 给顾源源汇报，等下一步
