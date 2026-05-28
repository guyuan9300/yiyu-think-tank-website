// 开源官网首页 · 集中链接配置（指令 §4.5：所有可配置链接集中，不散落硬编码）
//
// 状态约定：
//   'live'        正式可用链接
//   'placeholder' 占位（锚点/邮件/表单），尚未有正式落点，禁止做成死链
//
// 待益语团队确认的链接，统一在此处替换，不要散到各组件里。

export type LinkStatus = 'live' | 'placeholder';

export interface ConfiguredLink {
  href: string;
  external?: boolean;
  status: LinkStatus;
}

// 正式：开源仓库
export const GITHUB_URL = 'https://github.com/guyuan9300/yiyu-thinktank-workbench';

// 占位：下载入口尚未正式开放 → 锚点 + 文案标"内测/即将开放"
export const DOWNLOAD: ConfiguredLink = { href: '#download', status: 'placeholder' };

// 首页内部锚点（导航 + 各区块）
export const ANCHORS = {
  manifesto: '#manifesto',
  features: '#features',
  stories: '#stories',
  join: '#join',
  roadmap: '#roadmap',
  download: '#download',
} as const;

// 未来二级页面（暂未建 → 先指向首页锚点，禁止死链）
export const FUTURE_ROUTES = {
  features: ANCHORS.features,   // 以后 /features
  stories: ANCHORS.stories,     // 以后 /stories
  join: ANCHORS.join,           // 以后 /join
  roadmap: ANCHORS.roadmap,     // 以后 /roadmap
  modules: ANCHORS.features,    // 以后 /modules（模块市场雏形）
} as const;

// 占位：参与入口表单（暂无后端表单 → 先用飞书表单/邮件占位，集中在此替换）
// TODO(益语团队确认)：替换为各角色对应的真实表单/邮箱。
export const PARTICIPATE: Record<string, ConfiguredLink> = {
  actioner: { href: '#join', status: 'placeholder' },   // 提交我的行动需求
  developer: { href: GITHUB_URL, external: true, status: 'live' }, // 参与模块共建 → GitHub
  supporter: { href: '#join', status: 'placeholder' },  // 为行动者加电
  merchant: { href: '#join', status: 'placeholder' },   // 成为资源伙伴
  foundation: { href: '#join', status: 'placeholder' }, // 共建行动者生态
};

// 社群（占位：暂无正式社群链接，先锚点；禁止假二维码/未授权链接）
export const COMMUNITY: ConfiguredLink = { href: '#join', status: 'placeholder' };

// 法务/规范（占位锚点，尚未单独成页）
export const LEGAL = {
  license: { href: `${GITHUB_URL}/blob/main/LICENSE`, external: true, status: 'live' as LinkStatus },
  privacy: { href: '#', status: 'placeholder' as LinkStatus },
  security: { href: ANCHORS.roadmap, status: 'placeholder' as LinkStatus },
  brand: { href: '#', status: 'placeholder' as LinkStatus },
  contact: { href: '#join', status: 'placeholder' as LinkStatus },
};
