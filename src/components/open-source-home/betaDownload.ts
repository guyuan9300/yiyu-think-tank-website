// 益语智库 AI 下载 = 内测邀请制。任意"下载"入口都派发此事件, WorkbenchPage 接住弹出内测弹窗。
export const BETA_DOWNLOAD_EVENT = 'yiyu:beta-download';

export function openBetaDownload(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BETA_DOWNLOAD_EVENT));
}

// 内测码(客户端软门槛, 可随时增改; 大小写/空格不敏感)。上线接后端校验时换成 API。
const VALID_BETA_CODES = ['YIYU-AI-2026', 'YIYUAI2026', '益语内测'];

export function isValidBetaCode(code: string): boolean {
  const c = code.trim().toUpperCase().replace(/\s+/g, '');
  return VALID_BETA_CODES.map((x) => x.toUpperCase().replace(/\s+/g, '')).includes(c);
}

// macOS 安装包地址(内测准备中, 暂空; 拿到链接后填这里即自动放行下载)
export const MAC_DMG_URL = '';
