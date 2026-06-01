# HOMEPAGE M0 · 仓库与设计系统排查

> 任务：在当前仓库新建「益语智库开源官网首页」(行动者生态宣言页)。
> 决策(顾源源 2026-05-25)：① 新开独立首页路由，战略咨询首页 `/` 不动；② 配色按指令走**深蓝主色**(弃紫靛)。

## 1. 技术栈
- React 18 + TypeScript + Vite 5 + TailwindCSS 3；图标 lucide-react；无路由库(自研 `?page=` SPA 路由)。
- 部署 GitHub Pages / CVM Nginx，`base` 由 `VITE_BASE` 控制(dev=`/`)。

## 2. 首页入口与路由机制
- 入口：`index.html` → `src/main.tsx` → `src/App.tsx`(单文件路由分发，~800+ 行)。
- 路由：`App.tsx` 读 `?page=` → `ALLOWED_PAGES` Set 白名单(不在表内→404) → 一串 `if (currentPage === 'X') return <Comp/>`。
- **接入方式**(新首页)：在 `ALLOWED_PAGES` 加 `'open-source-home'`；加一条渲染分支 `if (currentPage === 'open-source-home') return <OpenSourceHomePage/>`。访问 `?page=open-source-home`。

## 3. Layout / 导航 / Footer
- `Header.tsx`：战略咨询站导航(首页/前沿洞察/学习中心/战略陪伴/关于我们)+登录。**与开源官网 IA 不同**(指令要：行动者宣言/功能模块/行动者故事/加入我们/Roadmap/GitHub + 下载/参与共建)。
- `Footer.tsx`：咨询站页脚，同样与指令所需开源页脚不同。
- 结论：开源官网首页**自带独立 Nav + Footer**，不复用咨询站 Header/Footer(IA 不同)，但复用其布局思路与字体。

## 4. 设计 token 现状 vs 目标
- 现状(`tailwind.config.js` + `index.css`)：品牌色=紫靛 `#4F46E5/#7C3AED/#A855F7`，暖白底 `#FAFAF9`，字体 Inter。已有 fade/scale 等动画与 `shadow-soft/medium/strong`、`gradient-text`。
- 目标(指令 §2.2/§4.3)：**深蓝主色 + 米白/暖白 + 浅灰蓝 + 低饱和橙(加电)**，最多 4 主色，禁高饱和科技蓝紫渐变，阴影要轻，大留白。
- 落地：新增 `os` 命名色组到 tailwind config(additive，不动现有紫靛 token，零影响咨询站)：
  `os.navy #0F2742 / os.blue #1D4E89 / os.canvas #FAF8F2 / os.mist #EAF0F6 / os.spark #D98244 / os.ink #16263A / os.muted #5C6B7A`。

## 5. 可复用组件 / 资产
- **无共享 UI 原子组件**(Button/Card/Section/Container/Badge 均内联在各页)。→ 需为新首页自建一套轻量原子组件(不引新 UI 库)。
- 可复用：`Header`/`Footer`(参考，不直接用)、`Footer` 分组思路、lucide 图标、动画类、`line-clamp` 等工具类。
- 图片资产：`public/images/open-source/`(hero-brain-loop / hero-circular-prototype / showroom-* / *-system 抽象图)，`public/images/workbench/*`(产品截图)。首屏抽象视觉可优先用 SVG 自绘 + 这些图。

## 6. 是否需要新增组件
**是。** 新建 `src/components/open-source-home/`：`links.ts`(集中链接)、`ui.tsx`(Container/Section/Card/Button/Badge/SectionHeading + 深蓝调色板)、`OpenSourceNav.tsx`、`OpenSourceFooter.tsx`、`sections/*`(Hero/Manifesto/Features/Stories/Join/FinalCta)、`OpenSourceHomePage.tsx`(compose)。不引入新 UI 框架。

## 7. M0 通过自检
| 指标 | 结果 |
|---|---|
| 找到首页入口 | ✅ index.html→main.tsx→App.tsx |
| 找到样式系统 | ✅ tailwind.config.js + index.css(紫靛/Inter) |
| 找到可复用组件 ≥3 | ✅ Header/Footer/动画类/lucide/工具类 |
| 明确是否需新增组件 | ✅ 是(自建 open-source-home/ 原子组件+区块) |
| 未引入新 UI 库 | ✅ 沿用 Tailwind+lucide |
| 输出审计报告 | ✅ 本文件 |
