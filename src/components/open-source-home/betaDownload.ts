// 益语智库 AI 下载 = 内测邀请制。任意"下载"入口都派发此事件, WorkbenchPage 接住弹出内测弹窗。
export const BETA_DOWNLOAD_EVENT = 'yiyu:beta-download';

export function openBetaDownload(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BETA_DOWNLOAD_EVENT));
}

// 内测码校验已全量切到后端 POST /api/v1/beta/verify-code(限时下载 token + 真实下载计数)。
// 第一期的客户端白名单与静态 DMG 地址已下线, 不要再加回——客户端白名单等于无门槛裸链接。
