import { useEffect, useState } from 'react';
import { Header } from '../Header';
import { OpenSourceFooter } from './OpenSourceFooter';
import { ScrollProgress } from './ScrollProgress';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { Stories } from './sections/Stories';
import { Join } from './sections/Join';
import { FinalCta } from './sections/FinalCta';
import { BetaDownloadModal } from './BetaDownloadModal';
import { BETA_DOWNLOAD_EVENT } from './betaDownload';
import { useLang } from '../../lib/i18n';

// ============================================================
// 开源工作台页 (?page=workbench) —— 报告 ↔ 关于我们 之间的独立页。
// 把原首页里"产品/演示"属性强的板块收到这里, 让首页回到"思想/使命"打头,
// 避免首页过度像"做软件的组织"。
//
// 组成: Hero (给行动者的礼物 + 产品自动演示动画) + Features (AI 核心能力 6 卡)
//      + FinalCta (下载开源版 + 共建)。
// ============================================================

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function WorkbenchPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t } = useLang();
  const [betaOpen, setBetaOpen] = useState(false);
  useEffect(() => {
    const open = () => setBetaOpen(true);
    window.addEventListener(BETA_DOWNLOAD_EVENT, open);
    return () => window.removeEventListener(BETA_DOWNLOAD_EVENT, open);
  }, []);
  useEffect(() => {
    const prevTitle = document.title;
    document.title = t({ zh: '益语智库 AI · 给行动者的开源 AI 工作系统', en: 'Yiyu AI · An open-source AI work system for changemakers' });
    setMeta(
      'description',
      t({
        zh: '益语智库 AI：一套给行动者使用的开源 AI 工作系统。AI 做整理、找证据、识别风险、起草材料；人类负责关系、判断、确认和行动。',
        en: 'Yiyu AI: an open-source AI work system for changemakers. AI organizes, finds evidence, flags risks, and drafts; humans handle relationships, judgment, confirmation, and action.',
      }),
    );
    return () => {
      document.title = prevTitle;
    };
  }, [t]);

  return (
    <div className="min-h-screen bg-os-canvas text-os-ink antialiased font-sans selection:bg-os-navy selection:text-white">
      <ScrollProgress />
      <div className="grain-overlay pointer-events-none fixed inset-0 z-[55] opacity-[0.035] mix-blend-soft-light" aria-hidden="true" />
      <Header onNavigate={onNavigate as any} />
      <main>
        <Hero />
        <Features />
        <Stories />
        <Join />
        <FinalCta />
      </main>
      <OpenSourceFooter />
      <BetaDownloadModal
        open={betaOpen}
        onClose={() => setBetaOpen(false)}
        onNavigate={(page) => onNavigate?.(page)}
      />
    </div>
  );
}
