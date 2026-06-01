// Hero 右侧自动演示舞台 —— 单卡 + 数据层 + 时间线。
//
// 视觉构成：
//   - 同一时刻只显示 active 卡（其它 scene 仍挂载但 opacity 0，确保 remount 重播机制可用）
//   - 切换 = 顺序 fade（先淡出旧的 0.2s，0.2s 延迟后淡入新的 0.3s）—— 两个 scene 永远不同框
//   - 下方紫蓝软光晕
//   - 底层 32×32 数据网格（radial mask 中心实/边缘虚）+ 6 个浮动微粒
//   - 底部时间线 3 节点 + 渐变连接线，active 节点脉冲发光
//
// 全 GPU 路径（perspective + transform + opacity，无 mask-image 关键帧）。

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarScene } from './scenes/CalendarScene';
import { WorkspaceScene } from './scenes/WorkspaceScene';
import { GrowthScene } from './scenes/GrowthScene';
import { useLang, type Bilingual } from '../../../lib/i18n';

type DemoStateId = 'calendar' | 'workspace' | 'growth';

interface DemoState {
  id: DemoStateId;
  shortLabel: Bilingual;
  tab: Bilingual;
  caption: Bilingual;
  dwellMs: number;
  render: () => JSX.Element;
}

const DEMO_STATES: DemoState[] = [
  { id: 'calendar', shortLabel: { zh: '任务月历', en: 'Task Calendar' }, tab: { zh: '任务与日程 · 我的月历', en: 'Tasks & Schedule · My Calendar' }, caption: { zh: '一个月的推进，密度看得见', en: 'A month of progress, density you can see' }, dwellMs: 3200, render: () => <CalendarScene /> },
  { id: 'workspace', shortLabel: { zh: '客户工作台', en: 'Client Workspace' }, tab: { zh: '工作台 · 日慈基金会', en: 'Workspace · Rici Foundation' }, caption: { zh: 'AI 读懂每一个客户的来龙去脉', en: 'AI that understands each client’s full story' }, dwellMs: 7000, render: () => <WorkspaceScene /> },
  { id: 'growth', shortLabel: { zh: '成长中心', en: 'Growth Center' }, tab: { zh: '成长中心 · 能力成长', en: 'Growth Center · Ability Growth' }, caption: { zh: '把工作经验变成组织资产', en: 'Turn work experience into organizational assets' }, dwellMs: 4700, render: () => <GrowthScene /> },
];

const SCENE_NATIVE_WIDTH = 1280;
const SCENE_NATIVE_HEIGHT = 920;

// 浮动微粒位置（保证视觉分散，不挡到中卡）
const PARTICLES: Array<{ left: string; top: string; delay: string }> = [
  { left: '5%', top: '20%', delay: '0s' },
  { left: '88%', top: '12%', delay: '1.8s' },
  { left: '18%', top: '85%', delay: '3.4s' },
  { left: '78%', top: '78%', delay: '2.2s' },
  { left: '46%', top: '8%', delay: '4.5s' },
  { left: '52%', top: '92%', delay: '6s' },
];

const HERO_CSS = `
@keyframes hpdParticleDrift {
  0%, 100% { transform: translate(0, 0); opacity: 0.25; }
  50%      { transform: translate(18px, -22px); opacity: 0.65; }
}
.hpd-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(91,123,254,0.7), rgba(124,58,237,0.7));
  filter: blur(0.4px);
  pointer-events: none;
  animation: hpdParticleDrift 10s ease-in-out infinite;
  will-change: transform, opacity;
}
@keyframes hpdNodePulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(91,123,254,0.18), 0 0 14px rgba(124,58,237,0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(91,123,254,0.06), 0 0 22px rgba(124,58,237,0.7);  }
}
.hpd-node-active .hpd-node-dot {
  background: linear-gradient(135deg, #5B7BFE, #7C3AED);
  border-color: rgba(124,58,237,0.5);
  animation: hpdNodePulse 2s ease-in-out infinite;
}
.hpd-grid {
  position: absolute;
  inset: -20px;
  background-image:
    linear-gradient(rgba(91,123,254,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91,123,254,0.07) 1px, transparent 1px);
  background-size: 32px 32px;
  -webkit-mask-image: radial-gradient(ellipse 85% 70% at center, black 35%, transparent 88%);
          mask-image: radial-gradient(ellipse 85% 70% at center, black 35%, transparent 88%);
  pointer-events: none;
}
.hpd-ambient-glow {
  position: absolute;
  inset: -8px;
  border-radius: 22px;
  box-shadow:
    0 22px 70px -16px rgba(91,123,254,0.35),
    0 8px 28px -8px rgba(124,58,237,0.28);
  pointer-events: none;
  z-index: -1;
}
/* 离屏: 暂停无限装饰动画 + 卸掉 will-change 释放合成层 */
.hpd-paused .hpd-particle,
.hpd-paused .hpd-node-active .hpd-node-dot {
  animation-play-state: paused;
}
.hpd-paused .hpd-particle {
  will-change: auto;
}
/* 尊重"减少动态效果": 关掉漂移与脉冲, 微粒退化为静态点 */
@media (prefers-reduced-motion: reduce) {
  .hpd-particle,
  .hpd-node-active .hpd-node-dot {
    animation: none !important;
  }
}
`;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = (): void => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

function useFitScale(targetWidth: number): { ref: React.RefObject<HTMLDivElement>; scale: number } {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    if (!ref.current) return;
    const update = (w: number): void => {
      if (w > 0) setScale(w / targetWidth);
    };
    update(ref.current.clientWidth);
    const ro = new ResizeObserver((entries) => {
      update(entries[0].contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [targetWidth]);
  return { ref, scale };
}

function WindowCard({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="rounded-[16px] bg-os-paper ring-1 ring-os-line shadow-os-lg overflow-hidden h-full">
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-os-mist/60 border-b border-os-line">
        <span className="w-2 h-2 rounded-full bg-os-navy/20" />
        <span className="w-2 h-2 rounded-full bg-os-navy/12" />
        <span className="w-2 h-2 rounded-full bg-os-navy/[0.08]" />
        <span className="ml-2 text-[11px] font-medium text-os-muted truncate">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SceneStage({ scale, children }: { scale: number; children: ReactNode }): JSX.Element {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: `${SCENE_NATIVE_WIDTH} / ${SCENE_NATIVE_HEIGHT}`,
        overflow: 'hidden',
        position: 'relative',
        background: '#FAFAFA',
      }}
    >
      <div
        style={{
          width: SCENE_NATIVE_WIDTH,
          height: SCENE_NATIVE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function HeroProductDemo(): JSX.Element {
  const reduced = useReducedMotion();
  const { t } = useLang();
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [centerCounter, setCenterCounter] = useState<number[]>(() => DEMO_STATES.map(() => 0));
  const { ref: containerRef, scale } = useFitScale(SCENE_NATIVE_WIDTH);
  const rootRef = useRef<HTMLDivElement>(null);

  // 离屏时暂停所有无限装饰动画 (微粒漂移 / 节点脉冲) 并卸掉 will-change, 省 CPU/电/合成层内存。
  // 直接 toggle class, 不走 React state, 避免无谓重渲染。
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => el.classList.toggle('hpd-paused', !e.isIntersecting),
      { rootMargin: '0px', threshold: 0 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    const dwell = DEMO_STATES[activeIdx].dwellMs;
    const t = setTimeout(() => {
      setActiveIdx((curr) => (curr + 1) % DEMO_STATES.length);
    }, dwell);
    return () => clearTimeout(t);
  }, [activeIdx, reduced, paused]);

  useEffect(() => {
    setCenterCounter((c) => {
      const nc = [...c];
      nc[activeIdx] += 1;
      return nc;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  const handleNodeClick = (idx: number): void => {
    if (idx === activeIdx) return;
    setActiveIdx(idx);
  };

  const activeState = DEMO_STATES[activeIdx];

  return (
    <div
      ref={rootRef}
      className="relative mx-auto w-full max-w-[640px]"
      role="group"
      aria-label={t({ zh: '益语智库产品自动演示（任务月历 / 客户工作台 / 成长中心）', en: 'Yiyu Institute product auto-demo (Task Calendar / Client Workspace / Growth Center)' })}
    >
      <style>{HERO_CSS}</style>

      <div className="pointer-events-none absolute -inset-16 -z-10">
        <div className="absolute right-[6%] top-[2%] w-[55%] h-[55%] rounded-full bg-os-blue/[0.10] blur-[90px]" />
        <div className="absolute left-[2%] bottom-[4%] w-[45%] h-[50%] rounded-full bg-os-violet/[0.09] blur-[90px]" />
      </div>

      {/* 3D 透视舞台（含数据网格 + 浮动微粒 + 单卡） */}
      <div
        className="relative"
        style={{ perspective: '1400px', perspectiveOrigin: 'center center' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Layer 1: 数据网格 */}
        <div className="hpd-grid" aria-hidden="true" />

        {/* Layer 2: 浮动微粒 */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="hpd-particle"
              style={{ left: p.left, top: p.top, animationDelay: p.delay }}
            />
          ))}
        </div>

        {/* Layer 3: 卡片栈（所有 scene 同位置叠加，只有 active 可见） */}
        <div
          ref={containerRef}
          className="relative"
          style={{
            transformStyle: 'preserve-3d',
            aspectRatio: `${SCENE_NATIVE_WIDTH} / ${SCENE_NATIVE_HEIGHT}`,
          }}
        >
          {DEMO_STATES.map((state, i) => {
            const isActive = i === activeIdx;
            const sceneKey = `s-${i}-${centerCounter[i]}`;
            return (
              <div
                key={`slot-${i}`}
                className="absolute inset-0"
                style={{
                  opacity: isActive ? 1 : 0,
                  // 非 active 卡略缩 0.96，切换时有"弹入"质感
                  transform: isActive ? 'scale(1)' : 'scale(0.96)',
                  zIndex: isActive ? 10 : 1,
                  pointerEvents: isActive ? 'auto' : 'none',
                  transformStyle: 'preserve-3d',
                  // 顺序 fade：active 延迟 0.2s 再淡入，inactive 立刻淡出 —— 两 scene 永远不同框
                  transition: reduced
                    ? undefined
                    : isActive
                    ? 'opacity 0.3s ease 0.2s, transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) 0.2s'
                    : 'opacity 0.2s ease, transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)',
                  willChange: 'opacity, transform',
                }}
                aria-hidden={!isActive}
              >
                {isActive && <div className="hpd-ambient-glow" aria-hidden="true" />}

                <WindowCard title={t(state.tab)}>
                  <SceneStage scale={scale}>
                    <div key={sceneKey}>{state.render()}</div>
                  </SceneStage>
                </WindowCard>
              </div>
            );
          })}
        </div>
      </div>

      {/* caption */}
      <div className="mt-6 text-center">
        <span
          key={activeIdx}
          className="inline-flex items-center gap-2 rounded-full bg-os-paper/80 ring-1 ring-os-line px-3.5 py-1.5 text-[12.5px] font-medium text-os-navy shadow-os animate-fade-in"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-os-violet" />
          {t(activeState.caption)}
        </span>
      </div>

      {/* 时间线导航 */}
      <div className="mt-5 flex items-center justify-center">
        {DEMO_STATES.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => handleNodeClick(i)}
                aria-label={t({ zh: `查看：${s.tab.zh}`, en: `View: ${s.tab.en ?? s.tab.zh}` })}
                aria-current={isActive}
                className={`group relative flex flex-col items-center px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-os-blue/40 rounded-md ${
                  isActive ? 'hpd-node-active' : ''
                }`}
              >
                <span
                  className="hpd-node-dot block transition-all duration-300"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: isActive ? undefined : 'rgba(91,123,254,0.18)',
                    border: '1.5px solid rgba(91,123,254,0.35)',
                  }}
                />
                <span
                  className={`mt-2 text-[11px] font-medium tracking-wide transition-colors duration-300 ${
                    isActive ? 'text-os-navy' : 'text-os-muted/70 group-hover:text-os-muted'
                  }`}
                >
                  {t(s.shortLabel)}
                </span>
              </button>
              {i < DEMO_STATES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mb-6 transition-colors duration-500"
                  style={{
                    width: 36,
                    height: 1,
                    background:
                      i < activeIdx
                        ? 'linear-gradient(to right, rgba(124,58,237,0.5), rgba(91,123,254,0.45))'
                        : 'rgba(91,123,254,0.18)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
