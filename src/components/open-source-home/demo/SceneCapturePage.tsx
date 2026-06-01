// SceneCapturePage —— GIF 录制专用最小页面
//
// 目的：scripts/capture-hero-gifs.mjs 通过 playwright 启 headless Chrome,
// 加载 `?page=hero-capture&scene=<id>` URL, 录像得到三个 scene 的 GIF。
//
// 设计要求:
//   - 不挂 Header、Footer、其它 section,只有一张 WindowCard
//   - 1:1 渲染 (scene 1280×920 native), 不缩放, 不响应 useFitScale
//   - body/html 零边距, WindowCard 顶在视口左上角
//   - 自动播放一遍场景内动画就停 (无轮播, 无 timeline, 无 caption)
//
// 使用:
//   - 在 App.tsx 路由表加 'hero-capture' 分支, 渲染本组件
//   - URL: ?page=hero-capture&scene=calendar | workspace | growth
//   - playwright 视口设 1280×958, recordVideo 同尺寸, 一比一抓帧

import { useEffect, type ReactNode } from 'react';
import { CalendarScene } from './scenes/CalendarScene';
import { WorkspaceScene } from './scenes/WorkspaceScene';
import { GrowthScene } from './scenes/GrowthScene';
import { useLang, type Bilingual } from '../../../lib/i18n';

type SceneId = 'calendar' | 'workspace' | 'growth';

const SCENE_NATIVE_WIDTH = 1280;
const SCENE_NATIVE_HEIGHT = 920;

interface SceneConfig {
  id: SceneId;
  tab: Bilingual;
  render: () => JSX.Element;
}

const SCENES: Record<SceneId, SceneConfig> = {
  calendar: { id: 'calendar', tab: { zh: '任务与日程 · 我的月历', en: 'Tasks & Schedule · My Calendar' }, render: () => <CalendarScene /> },
  workspace: { id: 'workspace', tab: { zh: '工作台 · 日慈基金会', en: 'Workspace · Rici Foundation' }, render: () => <WorkspaceScene /> },
  growth: { id: 'growth', tab: { zh: '成长中心 · 能力成长', en: 'Growth Center · Ability Growth' }, render: () => <GrowthScene /> },
};

function WindowCard({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="rounded-[16px] bg-os-paper ring-1 ring-os-line shadow-os-lg overflow-hidden" style={{ width: SCENE_NATIVE_WIDTH }}>
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-os-mist/60 border-b border-os-line">
        <span className="w-2 h-2 rounded-full bg-os-navy/20" />
        <span className="w-2 h-2 rounded-full bg-os-navy/12" />
        <span className="w-2 h-2 rounded-full bg-os-navy/[0.08]" />
        <span className="ml-2 text-[11px] font-medium text-os-muted truncate">{title}</span>
      </div>
      <div style={{ width: SCENE_NATIVE_WIDTH, height: SCENE_NATIVE_HEIGHT, position: 'relative', background: '#FAFAFA' }}>
        {children}
      </div>
    </div>
  );
}

export function SceneCapturePage(): JSX.Element {
  const { t } = useLang();
  const params = new URLSearchParams(window.location.search);
  const sceneId = (params.get('scene') || 'calendar') as SceneId;
  const config = SCENES[sceneId] ?? SCENES.calendar;

  // 录制页禁掉滚动条、消除任何外层 padding/margin
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlMargin = html.style.margin;
    const prevHtmlPadding = html.style.padding;
    const prevBodyMargin = body.style.margin;
    const prevBodyPadding = body.style.padding;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyBg = body.style.background;

    html.style.margin = '0';
    html.style.padding = '0';
    body.style.margin = '0';
    body.style.padding = '0';
    body.style.overflow = 'hidden';
    body.style.background = 'transparent';

    return () => {
      html.style.margin = prevHtmlMargin;
      html.style.padding = prevHtmlPadding;
      body.style.margin = prevBodyMargin;
      body.style.padding = prevBodyPadding;
      body.style.overflow = prevBodyOverflow;
      body.style.background = prevBodyBg;
    };
  }, []);

  // playwright 通过 window.__YIYU_CAPTURE_READY__ = true 来知道场景已挂载、可以开录
  useEffect(() => {
    // double rAF: 等浏览器至少 paint 一帧后再 ready,
    // 保证场景内部 useEffect(scroll-trigger / 计时器) 已经全启动
    let frame1 = 0;
    let frame2 = 0;
    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        (window as unknown as { __YIYU_CAPTURE_READY__?: boolean }).__YIYU_CAPTURE_READY__ = true;
      });
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, []);

  return (
    <div style={{ width: SCENE_NATIVE_WIDTH, background: 'transparent' }} data-scene={sceneId} data-capture-root="">
      <WindowCard title={t(config.tab)}>{config.render()}</WindowCard>
    </div>
  );
}
