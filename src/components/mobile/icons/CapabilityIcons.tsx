// 益语智库移动端 · 专属线性图标集
// 统一规范: 24×24 viewBox / stroke=currentColor / 圆角端点 / 默认 1.6 描边。
// 为 6 个能力领域手绘, 替代通用图标库, 支撑精致 App 质感。

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };
}

/** 战略路径清晰化 —— 蜿蜒路径 + 里程碑节点 + 终点旗 */
export function IconStrategyPath({ size = 24, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={strokeWidth}>
      <path d="M4 20c3 0 3.5-4 6-4s2.8 4 5.5 4" opacity="0" />
      <path d="M4.5 19.5c2.2-.4 2.6-4.2 5-5 2.6-.9 3.2-4.6 5.5-6" />
      <circle cx="4.5" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9.7" cy="14.2" r="1.3" fill="currentColor" stroke="none" />
      <path d="M15 8.5V3.5l4 1.4-4 1.4" />
    </svg>
  );
}

/** 组织效能重构 —— 顶节点连三底节点 (组织图) */
export function IconOrg({ size = 24, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={strokeWidth}>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="18.5" r="2.2" />
      <circle cx="12" cy="18.5" r="2.2" />
      <circle cx="19" cy="18.5" r="2.2" />
      <path d="M12 7.2v3.3M12 10.5H5v5.8M12 10.5h7v5.8M12 10.5v5.8" />
    </svg>
  );
}

/** 数字化与 AI 落地 —— 芯片 + 火花 */
export function IconAI({ size = 24, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={strokeWidth}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="3" />
      <path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3" />
      <path d="M12 9.5l.9 1.6 1.6.9-1.6.9-.9 1.6-.9-1.6-1.6-.9 1.6-.9z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 公益与社会创新 —— 破土新芽 */
export function IconSprout({ size = 24, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={strokeWidth}>
      <path d="M12 20v-7" />
      <path d="M12 13c0-3 2.2-5 5.5-5C17.5 11.2 15.3 13 12 13z" />
      <path d="M12 14.5c0-2.4-1.8-4-4.5-4C7.5 13 9.3 14.5 12 14.5z" />
      <path d="M7 20h10" />
    </svg>
  );
}

/** 商业增长与战略慈善 —— 上升柱 + 趋势箭头 */
export function IconGrowth({ size = 24, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={strokeWidth}>
      <path d="M4 20h16" />
      <path d="M6.5 20v-4M11 20v-7M15.5 20v-3" />
      <path d="M5 11.5l5-5 3 2.5 5.5-6" />
      <path d="M19 3v3.5h-3.5" />
    </svg>
  );
}

/** 内容·工具·知识沉淀 —— 错落层叠 */
export function IconLayers({ size = 24, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={strokeWidth}>
      <path d="M12 3.5l8 4.2-8 4.2-8-4.2 8-4.2z" />
      <path d="M4 12l8 4.2 8-4.2" />
      <path d="M4 16.2l8 4.2 8-4.2" />
    </svg>
  );
}

/** 索引: 供 6 能力领域按序取用 */
export const CAPABILITY_ICONS = [
  IconStrategyPath,
  IconOrg,
  IconAI,
  IconSprout,
  IconGrowth,
  IconLayers,
];
