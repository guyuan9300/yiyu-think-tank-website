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

- ✅ 已完成：
  - 迭代2（P0）：里程碑/目标/会议/文档/动态/课程推荐全部按 `projectId` 客户隔离；后台在“当前客户”上下文下维护；前台按 `clientId` 过滤展示

- ⏳ 进行中：
  - 截图补齐（战略陪伴页 & 客户专区页）

- ❌ 未完成（P0）：
  - “按钮无功能”统一处理（全站巡检）

---

## 缺口清单（按优先级）

| 页面(page) | 模块/区域 | 前台现状 | 后台入口 | 是否按客户隔离 | 缺口类型 | 修复方案 | 优先级 | 验收标准 |
|---|---|---|---|---:|---|---|---|---|
| strategy-companion | 顶部客户名 | 已随 selectedClient 切换 | 客户编辑弹窗（clientName） | ✅ | — | 已实现 | P0 | 切换客户后标题=客户名 |
| strategy-companion | Mission/Vision/Values | 已读取 ClientProject 字段；为空提示“请在后台填写” | 客户编辑弹窗新增 mission/vision/values | ✅ | — | 已实现 | P0 | 后台修改 → 前台切换客户可见 |
| strategy-companion | 战略里程碑 | 从 localStorage 按 `projectId` 加载 milestones；前台按当前 clientId 展示 | 后台（AdminStrategyCompanionPage）选中客户后可新增/编辑/改状态/删除 | ✅ | — | 已实现：StrategicMilestone 增加 projectId，前台过滤展示 | P0 | 不同客户里程碑可不同；后台改动刷新后可见 |
| strategy-companion | 本季度重点目标 | 从 localStorage 按 `projectId` 加载 goals+metrics；前台按当前 clientId 展示 | 后台选中客户后可新增/编辑/删除；指标随 goalId 维护 | ✅ | — | 已实现：StrategicGoal 增加 projectId，getStrategicGoals(projectId) | P0 | 切换客户目标列表不同且互不串数据 |
| strategy-companion | 文档资源 | 从 localStorage 按 `projectId` 加载 documents；前台按当前 clientId 展示 | 后台选中客户后可新增/编辑/删除（含密码保护字段） | ✅ | — | 已实现：ProjectDocument 增加 projectId，getProjectDocuments(projectId) | P0 | 不同客户看到不同文档；无 projectId 不展示 |
| strategy-companion | 会议记录 | 从 localStorage 按 `projectId` 加载 meetings；前台按当前 clientId 展示 | 后台选中客户后可新增/编辑/删除（含附件URL/会议链接/密码保护字段） | ✅ | — | 已实现：ProjectMeeting 增加 projectId，getProjectMeetings(projectId) | P0 | 不同客户看到不同会议；无 projectId 不展示 |
| strategy-companion | 最近动态(events) | 从 localStorage 按 `projectId` 加载 events；前台按当前 clientId 展示 | 后台选中客户后可新增/编辑/删除 | ✅ | — | 已实现：ProjectEvent 增加 projectId，getProjectEvents(projectId) | P0 | 不同客户看到不同动态；无 projectId 不展示 |
| strategy-companion | 课程推荐（赋能学院） | 从 localStorage 按 `projectId` 加载 course_recommendations；前台按当前 clientId 展示 | 后台选中客户后可新增/编辑/删除（internal/external） | ✅ | — | 已实现：CourseRecommendation(projectId) CRUD + 前台过滤 | P0 | 每客户不同推荐（含外链）；无 projectId 不展示 |
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

### Iteration 2（P0，已完成）
- [x] 里程碑/目标/会议/文档/动态/课程推荐全部增加 projectId 并按客户隔离
- [x] 后台各模块在“当前客户”上下文下维护（AdminStrategyCompanionPage）
- [ ] `SOURCES.md`：为 5 客户补齐真实互联网来源与内容（内容工作流待执行）

