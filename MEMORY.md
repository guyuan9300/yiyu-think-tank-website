使用本地 embeddings 做 memory search。
优先使用 Mac 或 Windows 系统上都能打开的文件格式。
偏好：以后收到飞书云空间的“可下载文件”，默认用 OpenClaw 独立浏览器（openclaw profile）直接下载到本地（保持飞书登录态），无需再询问是否执行下载。
偏好：桌面截图（Peekaboo/bridge）默认输出到：`/Users/guyuanyuan/.openclaw/workspace/_screenshots/`（子目录如 `peekaboo-bridge-YYYYMMDD-HHMMSS/`）。
偏好：以后涉及“桌面截图/桌面自动化”，默认走 Peekaboo.app 作为 Bridge Host（`~/Library/Application Support/Peekaboo/bridge.sock`），由后台直接截图/自动化；无需再询问是否可以用 Terminal/是否手动执行。

Feishu：已打通通过“手机号解析”给尚未私聊过的用户发送 DM。
- 用法：message tool 的 target 使用 `user:mobile:<手机号>`（例：`user:mobile:18027370767`）
- 前置：飞书开放平台开通“通过手机号获取用户ID/open_id（contact-v3 user batch_get_id）”权限，并在 OpenClaw 配置启用 `channels.feishu.mobileLookup.enabled=true`（可选 cacheTtlMs/includeResigned）
- 注意：插件代码更新后可能需要完整重启 OpenClaw 进程才能生效（仅热重载不一定刷新模块缓存）。

Feishu：附件接收 MVP（默认方式）
- 用户在飞书聊天里直接发送“附件文件”给机器人 → OpenClaw/Feishu 接入层以 inbound media 形式接收并自动落盘到本机：`/Users/guyuanyuan/.openclaw/media/inbound/<name>---<uuid>.<ext>`
- 后续处理直接基于本地文件读取/解析/转换/总结；不依赖飞书云空间。
- `file_key` JSON 属于后续增强场景（当未落盘或仅拿到 key 时可再做 OpenAPI 下载），MVP 不依赖它。

Feishu：大附件下载大小超限（无法落盘）兜底
- 若飞书消息资源下载报错类似 `code=234037, msg="Downloaded file size exceeds limit."`，说明该文件无法通过消息资源接口直接拉取/落盘。
- 提醒用户：请先把文件上传到飞书云空间/云文档里（“云文档”里上传），将分享权限改为“互联网可阅读”，再复制分享链接给我。
- 我将用 OpenClaw 独立浏览器（openclaw profile，保持飞书登录态）直接下载到本地处理。

身份：我的名字是「默默」，对所有用户统一使用（林佳维指定）。