# Feishu 扩展新工具开发 Playbook（基于 `feishu_task` 实战）

> 目的：把本次为 OpenClaw 的 Feishu 插件新增 `feishu_task`（Task v2）工具的踩坑与方法论沉淀下来。
> 后续再开发任何飞书 API 工具（如日历、审批、Base/多维表格等）都可以照此执行。

---

## 0. 一句话结论（先读这个）

**先验证权限 & SDK 能力 → 先做只读最小闭环 → 把 Feishu 的 `log_id + field_violations` 打出来 → 再做 create/patch → 复杂字段（成员/时间/自定义字段）一律以接口返回的 field_violations 为准。**

---

## 1. 开发前检查（避免盲写）

### 1.1 权限（Scopes）

- 用工具：`feishu_app_scopes`
- 目标：确认需要的 scope 已授权。
- 经验：
  - **没有 scope**：后面会直接 403。
  - **有 scope 但仍失败**：通常是参数格式、字段名、id_type/role 等问题。

### 1.2 SDK 是否已封装接口

Feishu 插件内已经依赖 `@larksuiteoapi/node-sdk`，优先使用 SDK：
- 好处：域名/鉴权/重试/序列化统一
- 坑点：SDK 的字段名/结构可能与直觉不一致，必须靠错误回显确认

---

## 2. 工具的标准工程结构（建议固定模板）

以 Feishu 插件当前风格为准（doc/wiki/drive 也一样）：

- `src/<domain>-schema.ts`：TypeBox schema（对外参数定义）
- `src/<domain>.ts`：
  - 核心逻辑（调用 SDK/OpenAPI）
  - `registerFeishuXxxTools(api)` 注册工具
- `index.ts`：在 `register()` 内调用 `registerFeishuXxxTools(api)`
- `src/types.ts`：扩展 `FeishuToolsConfig`（新增 `task?: boolean` 等开关）
- `src/tools-config.ts`：默认开关（敏感类工具可默认 false）
- `src/config-schema.ts`：把新开关写进 zod schema

> 经验：schema 设计要“面向调用者”，接口字段差异在工具内部做映射，不要把飞书 API 的怪字段直接暴露给用户。

---

## 3. Debug 的关键：把 Feishu 的错误信息完整回传

飞书 OpenAPI 报错如果只看到 `status code 400` 基本等于瞎猜。

**必须回显：**
- `code`
- `msg`
- `log_id`
- `field_violations`（如果有）

建议在 tool execute 的 catch 中返回：
- `err.message`
- `err.response?.data`

> 经验：`log_id + field_violations` 是最快的排查路径。飞书提供 troubleshooter 链接也可直接打开定位。

---

## 4. Task v2（`feishu_task`）真实踩坑清单（必看）

### 4.1 Create：必填字段是 `summary`

- 现象：400，`field validation failed`，`summary is required`
- 处理：工具内部兼容：
  - `summary = params.summary ?? params.title`

### 4.2 Patch：必须传 `update_fields`

- 现象：400，`update_fields is required`
- 处理：
  - 允许外部显式传 `update_fields`
  - 同时工具内可根据用户传入字段 **自动推导** `update_fields`

### 4.3 Patch：body 必须包含 `task` 对象

- 现象：400，`Invalid Param 'task', must not be empty.`
- 正确结构：

```json
{
  "update_fields": ["due"],
  "task": {
    "due": { "timestamp": 1772161200000, "is_all_day": false }
  }
}
```

### 4.4 `due` 的类型：不是 string/number，而是对象

踩坑路径：
- `"2026-02-27T...Z"`（UTC）→ 400
- `"2026-02-27T...+08:00"`（带时区）→ 400
- `1772161200000`（毫秒）→ 400

最终正确：

```json
"due": { "timestamp": 1772161200000, "is_all_day": false }
```

### 4.5 负责人不能用 patch 改（update_fields 不支持 assignees）

- 现象：400，提示 `update_fields` 只支持某些字段（列表里没有 assignees）
- 处理：走 `add_members` 接口，而不是 patch。

### 4.6 add_members：`members[*].role` 必填

- 现象：400，`members[*].role is required`
- 处理：
  - `role: "assignee"` 或 `"follower"`

> 经验：同一个“负责人”概念在 API 里可能是 assignees/members/role，并且更新路径不同。**不要凭直觉，按 field_violations 改。**

---

## 5. 重启/Reload 策略（减少人工重启）

### 5.1 为什么需要重启
- tool schema / action 变化后，需要网关 reload 才会生效

### 5.2 建议配置
- 开启 `commands.restart=true`（调试期）
- 让 agent 通过 gateway 自己触发 reload/restart

### 5.3 约束建议
- 调试期可以多次 no-op patch 触发 reload
- 稳定后建议：
  - 把变更“打包”，一次 reload
  - 或尽量做向后兼容，减少 schema 变化

---

## 6. 推荐的“新 tool 上线最小闭环 Checklist”

1) ✅ scopes：`feishu_app_scopes` 确认权限
2) ✅ 最小只读：先做 `get/list`
3) ✅ 错误回显：必须包含 `log_id + field_violations`
4) ✅ create：打通创建
5) ✅ patch：处理 `update_fields + task` 结构
6) ✅ 复杂字段：成员/时间/自定义字段
7) ✅ 最终回查：调用 `get` 确认写入成功

---

## 7. 下一步改进建议（可选）

- **把 Task v2 的字段映射写成单元测试或“录制用例”**：
  - create → get → patch(due) → addMembers → get
- 工具层面增强：
  - `feishu_task.patch` 自动拆分为：
    - patch 允许字段
    - addMembers / removeMembers（成员变更）
- 文档层面补充：
  - 常见错误码与对应修复（400/403/99992402/1470400/9499 等）

---

## 附：本次任务的关键定位信号（供检索）

- `summary is required`
- `update_fields is required`
- `Invalid Param 'task', must not be empty.`
- `Invalid parameter type in json: due`
- `members[*].role is required`
