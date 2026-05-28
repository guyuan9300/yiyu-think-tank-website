import { useEffect, useState } from 'react';
import { Header } from '../Header';
import { OpenSourceFooter } from './OpenSourceFooter';
import { Hero } from './sections/Hero';
import { Manifesto } from './sections/Manifesto';
import { QuoteBand } from './sections/QuoteBand';
import { Features } from './sections/Features';
import { Ledger } from './sections/Ledger';
import { Stories } from './sections/Stories';
import { Join } from './sections/Join';
import { FinalCta } from './sections/FinalCta';

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setP(total > 0 ? window.scrollY / total : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 inset-x-0 h-[2px] z-[60]">
      <div
        className="h-full bg-gradient-to-r from-os-navy via-os-blue to-os-spark transition-[width] duration-100"
        style={{ width: `${p * 100}%` }}
      />
    </div>
  );
}

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function OpenSourceHomePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  // SEO 基础：title + description（OG 在 index.html 维护，后续补全）
  useEffect(() => {
    const prevTitle = document.title;
    document.title = '益语智库开源版 · 给行动者的一份礼物';
    setMeta(
      'description',
      '益语智库开源版：一套给行动者使用的开源 AI 工作系统。AI 做整理、找证据、识别风险、起草材料；人类负责关系、判断、确认和行动。',
    );
    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-os-canvas text-os-ink antialiased font-sans selection:bg-os-navy selection:text-white">
      <ScrollProgress />
      {/* 全局极淡噪点叠层：加纸面质感（D · 氛围） */}
      <div className="grain-overlay pointer-events-none fixed inset-0 z-[55] opacity-[0.035] mix-blend-soft-light" aria-hidden="true" />
      <Header onNavigate={onNavigate as any} />
      <main>
        <Hero />
        <Manifesto />
        <QuoteBand />
        <Features />
        <Ledger />
        <Stories />
        <Join />
        <FinalCta />
      </main>
      <OpenSourceFooter />
    </div>
  );
}
