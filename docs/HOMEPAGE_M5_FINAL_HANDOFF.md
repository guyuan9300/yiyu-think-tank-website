# HOMEPAGE M5 · 最终交付报告

> 任务：益语智库开源官网首页（行动者生态宣言页）。
> 仓库：`yiyu-think-tank-website`（独立官网仓库，非软件主仓库）。
> 路由：`?page=open-source-home`（战略咨询首页 `/` 未改动）。
> 状态：第一版完成，已过两轮优化（建首页 + 按《设计复盘与优化建议》P0/P1 强化身份与意图）。

## 1. 修改文件
- `tailwind.config.js` — 新增 `os.*` 深蓝调色板 + `shadow-os/os-lg`（additive，不影响咨询站紫靛 token）
- `index.html` — 引入 Noto Serif SC 衬线（带 macOS/系统兜底）
- `src/index.css` — 新增 `font-serif-display` 等工具类（additive）
- `src/App.tsx` — 注册路由：import + `ALLOWED_PAGES` 加 `open-source-home` + 渲染分支

## 2. 新增组件（`src/components/open-source-home/`）
- `OpenSourceHomePage.tsx`（compose + SEO title/description + 滚动进度条）
- `OpenSourceNav.tsx`（吸顶导航，移动端精简 4 入口）
- `OpenSourceFooter.tsx`（深蓝页脚 + 组织身份说明 + 5 链接组）
- `ui.tsx`（Container/Section/SectionHeading/Card/Badge/Button/Reveal + 调色板）
- `links.ts`（集中链接配置 + live/placeholder 状态）
- `sections/`：`Hero` `Manifesto` `Features` `Stories` `Join` `FinalCta`

## 3. 页面截图
- `~/Desktop/开源网页制作/开源官网首页_整页_20260525-1741.png`（v1）
- `~/Desktop/开源网页制作/开源官网首页_整页_v2优化_20260525-1908.png`（v2，当前）

## 4. 本地启动
```
cd ~/openclaw/workspace/yiyu-think-tank-website
npm run dev      # http://localhost:5173/?page=open-source-home
```

## 5. 构建 / 类型检查 / Lint
| 项 | 结果 |
|---|---|
| `tsc --noEmit` | ✅ 0 error |
| `vite build` | ✅ 通过（CSS 146.94→155.44kB，新增调色板） |
| Lint | 仓库无独立 lint 脚本；以 tsc 为准 |
| Lighthouse | ⚠️ **未跑**。注意：主 JS bundle ~1.3MB 是**整站共享包**（含 pdf 等，历史既有），非本页引入；性能优化需整站 code-split，建议作为后续项单独处理 |

## 6. 4+1 结构符合度
✅ 导航 / 精神区(Hero+行动者宣言) / 功能(6卡) / 行动者故事(4卡) / 加入我们(5入口+透明看板) / 底部转化 + 页脚。一级内容区块 ≤6。

## 7. 链接：正式 vs 占位
- **正式**：GitHub(`guyuan9300/yiyu-thinktank-workbench`)、GitHub Issues、开源协议(LICENSE)、关于益语组的咨询站内链(`?page=about/strategy/report-library`)。
- **占位**（锚点/GitHub，**无死链**）：`下载开源版`→`#download`(底部转化区，标"内测准备中")；5 类参与入口表单→`#join` 或 GitHub；隐私/安全边界/品牌规范/联系方式→占位锚点。

## 8. 待益语团队确认（替换 `links.ts` 即可）
1. 开源版**真实下载地址**（火山云 TOS / GitHub Releases？）
2. 5 类角色的**真实表单/邮箱**（行动者需求 / 加电 / 资源伙伴 / 基金会）
3. 隐私说明 / 安全边界 / 品牌使用规范 / 社群 链接或页面
4. "研究报告"是否就指向咨询站 `report-library`
5. Roadmap 页是否需要（现为锚点占位）

## 9. 后续二级页面建议（首页已留入口）
`/features` 功能模块页(搜索+筛选+模块卡) · `/stories` 行动者故事页 · `/join` 加入我们页(表单+看板) · `/roadmap` 已实现/完善中/Roadmap · `/modules` 模块市场雏形。

## 10. 对照指令自检
| 维度 | 结果 |
|---|---|
| 最高定位"给行动者的一份礼物" | ✅ Hero H1 |
| 智库身份(非软件公司) | ✅ 导航副标识/Eyebrow/Hero 副标题/Footer 身份说明 |
| AI 不替代人、人类确认边界 | ✅ 4 处 |
| 功能区=场景+问题+设计思路+管理思想标签 | ✅ |
| 案例=原问题→管理思想→行动变化 | ✅ |
| 加入我们 5 类角色明确 CTA | ✅ |
| 深蓝主色 / ≤4 主色 / 无紫蓝霓虹 | ✅ |
| 无虚构数据 / 状态标注真实 | ✅（见 M4） |
| 移动端无横向滚动 / 导航折叠 | ✅ |
| 死链 | ✅ 0 |
| 主观验收（8秒理解/60秒价值/角色路径/身份认知/视觉质感） | 需人工体验确认 |

## 11. 未决 / 风险
- Lighthouse 性能受整站共享 bundle 影响，需整站 code-split（超出本页范围）。
- 占位链接待团队给真实落点后替换。
- 内容真实性（功能"已实现"口径、2.1 真截图）此前已在 `V2.1/docs/AI_COORDINATION` 提给 A+顾源源，待回口径。
