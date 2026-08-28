# 益语智库隐藏手册工作页

该模块独立于官网主 SPA 构建，只部署到 `/library-handbook/`，不修改首页、导航、搜索入口或当前生产 `index.html`。页面与响应头均设置 `noindex, nofollow, noarchive`。

## 组成

- `index.html` / `styles.css` / `app.js`：移动端优先的十一册原生网页阅读与管理界面；正文可选择、复制，但不可直接编辑。
- `content/`（部署产物）：按“分册 / 章节”拆分的 JSON 正文和仅被正文实际引用的图片。页面一次只载入当前章节，并预取下一章。
- `scripts/build-library-handbook-content.py`：从 11 个 DOCX 保序提取标题、段落、列表、表格、图片、链接和脚注，并生成内容一致性检查报告。
- `server.mjs`：独立 Node 服务，公开读取资料清单；上传和删除操作复用益语智库现有管理员会话验证。
- `yiyu-library-workspace.service`：端口 `8792` 的隔离 systemd 服务。
- `nginx-location.conf`：隐藏页面、资料 API 和健康检查三个独立路由。

静态页面部署到 `/srv/yiyu-library-workspace/public/`，与官网发布目录隔离，避免官网版本切换时被清理。

## 数据边界

- 资料清单：`/var/www/yiyu-site-data/library-handbook/manifest.json`
- 上传文件：`/var/www/yiyu-site-data/uploads/library-handbook/`
- 支持：PDF、DOCX、Markdown、TXT、PNG、JPG、WEBP；单文件不超过 64 MB。
- Agent 仅保留界面与结构化演示，尚未连接模型或全文检索，不能对外宣称已经具备真实问答能力。

章节 Agent 的接口、协作、鉴权、部署和验收约定见 [`AGENT_HANDOFF.md`](./AGENT_HANDOFF.md)。接手方必须先阅读该文档，不得直接在生产环境替换模拟聊天。

## 生成原生网页正文

源文件顺序由 `output/pdf/source-map.tsv` 指定，生成目录默认为 `output/library-web-content/`：

```bash
python3 scripts/build-library-handbook-content.py \
  --map output/pdf/source-map.tsv \
  --out output/library-web-content
```

生成器会逐册比较 DOCX 正文顺序哈希与网页正文顺序哈希；任一不一致、正文引用图片缺失或章节为空时，生成步骤失败。部署时把生成目录整体放到 `/srv/yiyu-library-workspace/public/content/`，不要把 11 个 DOCX 或 PDF 当作正文阅读器。
