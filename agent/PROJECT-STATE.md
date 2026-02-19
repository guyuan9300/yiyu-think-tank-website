# PROJECT-STATE (益语智库官网 / 百佑星际)

## 目标
让网站像真人使用时“可点击、可到达、可完成、可理解”，每轮都有证据可追溯。

## 成功标准（Definition of Success）
- P0 功能清零（见 BACKLOG.json 中 priority=P0 且 status!=done 的数量为 0）
- 关键用户旅程（首页→洞察→学习中心→关于我们→登录/工作台入口）端到端可走通，且每条有 evidence。

## 当前阶段
Discovery + Fix（P0 功能闭环优先）

## Top 5 风险与应对（摘要）
- 后台能力/数据落点不明确（上传/表单/订阅）→ 写入 needs_human.md，前台先做“不断链引导”。
- GitHub Pages 部署/缓存延迟 → evidence 记录线上验证时间点，必要时触发 re-run workflow。
- 需求范围漂移（P2 抢占）→ 每轮只做 1 个 P0 feature。
- 证据缺失导致争议 → 统一 evidence 目录 + summary.json。
- 自动化脚本不稳定 → 先保证最小集稳定（导航/CTA/列表→详情）。

## 当前 Top 10 待办（从 BACKLOG.json 取）
见 agent/BACKLOG.json
