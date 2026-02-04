使用本地 embeddings 做 memory search。
优先使用 Mac 或 Windows 系统上都能打开的文件格式。
偏好：以后收到飞书云空间的“可下载文件”，默认用 OpenClaw 独立浏览器（openclaw profile）直接下载到本地（保持飞书登录态），无需再询问是否执行下载。
偏好：桌面截图（Peekaboo/bridge）默认输出到：`/Users/guyuanyuan/.openclaw/workspace/_screenshots/`（子目录如 `peekaboo-bridge-YYYYMMDD-HHMMSS/`）。
偏好：以后涉及“桌面截图/桌面自动化”，默认走 Peekaboo.app 作为 Bridge Host（`~/Library/Application Support/Peekaboo/bridge.sock`），由后台直接截图/自动化；无需再询问是否可以用 Terminal/是否手动执行。

Feishu：已打通通过“手机号解析”给尚未私聊过的用户发送 DM。
- 用法：message tool 的 target 使用 `user:mobile:<手机号>`（例：`user:mobile:18027370767`）
- 前置：飞书开放平台开通“通过手机号获取用户ID/open_id（contact-v3 user batch_get_id）”权限，并在 OpenClaw 配置启用 `channels.feishu.mobileLookup.enabled=true`（可选 cacheTtlMs/includeResigned）
- 注意：插件代码更新后可能需要完整重启 OpenClaw 进程才能生效（仅热重载不一定刷新模块缓存）。