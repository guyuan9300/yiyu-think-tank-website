import { useEffect } from 'react';
import { Header } from '../Header';
import { OpenSourceFooter } from './OpenSourceFooter';
import { ScrollProgress } from './ScrollProgress';
import { HomeScrollStory } from './sections/HomeScrollStory';
import { IntroduceYiyu } from './sections/IntroduceYiyu';
import { BooksShowcase } from './sections/BooksShowcase';
import { QuoteBand } from './sections/QuoteBand';
import { Ledger } from './sections/Ledger';
import { Join } from './sections/Join';
import { FinalCta } from './sections/FinalCta';
import { useLang } from '../../lib/i18n';

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function OpenSourceHomePage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const { t } = useLang();
  // SEO 基础：title + description（OG 在 index.html 维护，后续补全）
  useEffect(() => {
    const prevTitle = document.title;
    document.title = t({ zh: '益语智库 · 把战略思想做成持续陪伴组织的 AI 工具', en: 'Yiyu Institute · Turning strategic thinking into AI tools that accompany organizations' });
    setMeta(
      'description',
      t({
        zh: '益语智库是一家把战略思想做成 AI 工具的组织陪伴公司。组织经营是一个整体，但今天所有工具都把它切碎了——我们用 AI 和工作系统，把多年战略咨询沉淀的组织思想承载下来，持续陪伴客户。',
        en: 'Yiyu Institute turns strategic thinking into AI tools that accompany organizations. Running an organization is one whole, yet today every tool slices it apart—we use AI and work systems to carry the organizational thinking distilled from years of strategy consulting, accompanying clients over the long term.',
      }),
    );
    return () => {
      document.title = prevTitle;
    };
  }, [t]);

  // 营销页轻磁吸:仅本页挂 snap-on(尊重 prefers-reduced-motion);离开自动摘除,内容页不受影响
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('snap-on');
    return () => document.documentElement.classList.remove('snap-on');
  }, []);

  return (
    <div className="min-h-screen bg-os-canvas text-os-ink antialiased font-sans selection:bg-os-navy selection:text-white">
      <ScrollProgress />
      {/* 全局极淡噪点叠层：加纸面质感（D · 氛围） */}
      <div className="grain-overlay pointer-events-none fixed inset-0 z-[55] opacity-[0.035] mix-blend-soft-light" aria-hidden="true" />
      <Header onNavigate={onNavigate as any} />
      <main>
        <HomeScrollStory onNavigate={onNavigate} />
        <IntroduceYiyu />
        <BooksShowcase onNavigate={onNavigate} />
        <QuoteBand />
        <Ledger />
        <Join />
        <FinalCta />
      </main>
      <OpenSourceFooter />
    </div>
  );
}
