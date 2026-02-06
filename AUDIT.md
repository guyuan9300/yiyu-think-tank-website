# AUDIT — 前后台一致性审计（益语智库）

> 目标：找出并系统解决“前台展示/按钮/数据”与“后台可维护能力”不一致的问题。
> 
> 说明：本审计以 iPhone16（393×852）与飞书 WebView 为移动端基准。

## 状态概览

- ✅ 已完成：
  - Header 导航兜底修复（避免卡在书库）
  - iPhone16 下 StrategyPage（战略陪伴页）卡片细竖条问题：案例/洞察/工具改为响应式栅格
  - 管理员 PageSwitcher 脚手架恢复（admin 默认可见）
  - 战略客户：后台一键生成 5 客户（演示用）
  - ✅ **迭代1-部分完成**：ClientProject 增加 mission/vision/values，后台可编辑，前台（strategy-companion）显示客户名+Mission/Vision/Values（随切换）

- ⏳ 进行中：
  - 迭代1 验收截图与验证步骤补齐

- ❌ 未完成（P0）：
  - 里程碑/目标/会议/文档/动态/课程推荐按客户隔离（projectId）
  - 后台缺少：客户里程碑/课程推荐/按客户目标等完整维护入口
  - “按钮无功能”统一处理

---

## 缺口清单（按优先级）

| 页面(page) | 模块/区域 | 前台现状 | 后台入口 | 是否按客户隔离 | 缺口类型 | 修复方案 | 优先级 | 验收标准 |
|---|---|---|---|---:|---|---|---|---|
| strategy-companion | 顶部客户名 | 已随 selectedClient 切换 | 客户编辑弹窗（clientName） | ✅ | — | 已实现 | P0 | 切换客户后标题=客户名 |
| strategy-companion | Mission/Vision/Values | 已读取 ClientProject 字段；为空提示“请在后台填写” | 客户编辑弹窗新增 mission/vision/values | ✅ | — | 已实现 | P0 | 后台修改 → 前台切换客户可见 |
| strategy-companion | 战略里程碑 | 仍使用 mockMilestones（写死） | 仅有全局战略里程碑 + 项目里程碑映射（不支持每客户自定义阶段） | ❌ | A/C | 新增“客户里程碑”实体（带 projectId），后台可维护；前台按客户展示 | P0 | 每客户里程碑名称/数量不同且可后台改 |
| strategy-companion | 本季度重点目标 | 当前为全局 strategic_goals（未按客户过滤） | 目标管理（全局） | ❌ | A | goals 增加 projectId；后台按当前客户新增/编辑；前台过滤 | P0 | 切换客户目标列表不同 |
| strategy-companion | 文档资源 | 当前 documents 全局共享 | 文档管理（全局） | ❌ | A | documents 增加 projectId；后台写入；前台过滤 | P0 | 不同客户看到不同文档 |
| strategy-companion | 会议记录 | 当前 meetings 全局共享 | 会议管理（全局） | ❌ | A | meetings 增加 projectId；后台写入；前台过滤 | P0 | 不同客户看到不同会议 |
| strategy-companion | 最近动态(events) | 当前 events 全局共享 | 动态管理（全局） | ❌ | A | events 增加 projectId；后台写入；前台过滤 | P0 | 不同客户看到不同动态 |
| strategy-companion | 课程推荐（赋能学院） | 当前写死/全局 | 无 | ❌ | A/C | 新增 course_recommendations（internal/external）；后台可维护；前台过滤 | P0 | 每客户不同推荐，可含外链 |
| strategy | 管理员客户下拉 | 已存在下拉，但依赖本地客户列表 | 无（仅从 localStorage 读取） | ✅ | B | 继续；后续改为从统一数据源 | P1 | 下拉选择→进入 companion 并带 clientId |
| strategy | “了解合作方式”按钮 | admin 下替换为下拉 | — | — | — | 已实现 | P1 | admin 显示下拉，非 admin 显示按钮 |
| all | 按钮无功能 | 多处存在 placeholder | 不一 | — | C | 统一三态：已实现/未开放提示/权限不足提示；补 TODO | P0 | 任何按钮点击都有反馈 |
| mobile | 卡片细竖条 | StrategyPage 已修；其他页待巡检 | — | — | D | 全站检查固定栅格，统一响应式策略 | P0 | iPhone16 无细竖条、可读可点 |

---

## 迭代计划（执行中）

### Iteration 1（已部分完成）
- [x] ClientProject 增加 mission/vision/values
- [x] 后台客户编辑弹窗增加填写位置
- [x] 前台显示客户名 + Mission/Vision/Values
- [ ] 补齐验证步骤与截图（修复前后）

### Iteration 2（下一步，P0）
- [ ] 里程碑/目标/会议/文档/动态/课程推荐全部增加 projectId 并按客户隔离
- [ ] 后台各模块在“当前客户”上下文下维护
- [ ] `SOURCES.md`：为 5 客户补齐真实互联网来源与内容

