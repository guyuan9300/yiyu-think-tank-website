// 搬自益语智库 2.1：src/renderer/components/handbook/GrowthCenterView.tsx
// （第 708–780 行的 AbilityRadar 函数）
// 与软件原件的差异：
//   1) 类型 import 改成本地相对路径（types 提取到 ./growthTypes.ts）
// 其余 JSX / SVG 数学 / 文案 / 颜色 / strokeDasharray 均与软件原件字节级一致。
import type { GrowthAbilityScore, GrowthAbilityGap } from './growthTypes';

type HexPoint = [number, number];

interface AbilityRadarProps {
  abilities: GrowthAbilityScore[];
  gaps?: GrowthAbilityGap[];
}

export function AbilityRadar({ abilities, gaps }: AbilityRadarProps): JSX.Element | null {
  const size = 320;
  const cx = 160;
  const cy = 160;
  const R = 110;
  const n = abilities.length;
  if (n < 3) return null;

  const angles = abilities.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);
  const hexPt = (angle: number, r: number): HexPoint => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  const hexPoly = (r: number): string => angles.map((a) => hexPt(a, r).join(',')).join(' ');

  const gapMap = new Map((gaps || []).map((g) => [g.abilityKey, g.requiredScore]));
  const hasRequired = gapMap.size > 0;

  const prevPts = abilities.map((ab, i) => hexPt(angles[i], (R * ab.previousScore) / 100).join(',')).join(' ');
  const curPts = abilities.map((ab, i) => hexPt(angles[i], (R * ab.currentScore) / 100).join(',')).join(' ');
  const reqPts = hasRequired
    ? abilities
        .map((ab, i) => hexPt(angles[i], (R * (gapMap.get(ab.abilityKey) ?? ab.currentScore)) / 100).join(','))
        .join(' ')
    : '';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid */}
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((s) => (
        <polygon key={s} points={hexPoly(R * s)} fill="none" stroke="#f1f5f9" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {angles.map((a, i) => {
        const [ex, ey] = hexPt(a, R);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="#f1f5f9" strokeWidth="1" />;
      })}
      {/* Previous (gray dashed) */}
      <polygon points={prevPts} fill="rgba(203,213,225,0.12)" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Required (amber dashed) */}
      {hasRequired && (
        <polygon points={reqPts} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3 3" />
      )}
      {/* Current (blue filled) */}
      <polygon points={curPts} fill="rgba(91,123,254,0.15)" stroke="#5B7BFE" strokeWidth="2" />
      {/* Current dots */}
      {abilities.map((ab, i) => {
        const [dx, dy] = hexPt(angles[i], (R * ab.currentScore) / 100);
        return <circle key={ab.abilityKey} cx={dx} cy={dy} r={4} fill="#5B7BFE" stroke="#fff" strokeWidth={2} />;
      })}
      {/* Labels */}
      {abilities.map((ab, i) => {
        const [lx, ly] = hexPt(angles[i], R + 32);
        const anchor = lx < cx - 10 ? 'end' : lx > cx + 10 ? 'start' : 'middle';
        return (
          <g key={`lbl-${ab.abilityKey}`}>
            <text x={lx} y={ly - 2} textAnchor={anchor} dominantBaseline="central" fontSize="12" fontWeight="500" fill="#64748b">
              {ab.label}
            </text>
            <text x={lx} y={ly + 14} textAnchor={anchor} dominantBaseline="central" fontSize="11" fontWeight="600" fill="#5B7BFE">
              {ab.currentScore}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
