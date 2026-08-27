# 益语智库隐藏手册工作页

该模块独立于官网主 SPA 构建，只部署到 `/library-handbook/`，不修改首页、导航、搜索入口或当前生产 `index.html`。页面与响应头均设置 `noindex, nofollow, noarchive`。

## 组成

- `index.html` / `styles.css` / `app.js`：移动端优先的十一册阅读与管理界面。
- `server.mjs`：独立 Node 服务，公开读取资料清单；上传和删除操作复用益语智库现有管理员会话验证。
- `yiyu-library-workspace.service`：端口 `8792` 的隔离 systemd 服务。
- `nginx-location.conf`：隐藏页面、资料 API 和健康检查三个独立路由。

## 数据边界

- 资料清单：`/var/www/yiyu-site-data/library-handbook/manifest.json`
- 上传文件：`/var/www/yiyu-site-data/uploads/library-handbook/`
- 支持：PDF、DOCX、Markdown、TXT、PNG、JPG、WEBP；单文件不超过 64 MB。
- Agent 仅保留界面与结构化演示，尚未连接模型或全文检索，不能对外宣称已经具备真实问答能力。
