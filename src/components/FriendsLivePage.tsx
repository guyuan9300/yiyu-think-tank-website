import { ArrowLeft, Radio, Sparkles } from 'lucide-react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { useLang } from '../lib/i18n';

// ============================================================
// 「益语的朋友们 · 直播讨论」介绍详情页 (占位)
// 入口: 付费弹窗权益里"益语的朋友们 · 直播讨论"链接。
// 正式内容/排版待设计, 当前为占位骨架, 确认方向后再填充。
// ============================================================

interface FriendsLivePageProps {
  onNavigate?: (page: string) => void;
}

export function FriendsLivePage({ onNavigate }: FriendsLivePageProps) {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-os-canvas flex flex-col">
      <Header onNavigate={(page) => onNavigate?.(page)} />

      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
              else onNavigate?.('home');
            }}
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-os-muted hover:text-os-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />{t({ zh: '返回', en: 'Back' })}
          </button>

          <div className="rounded-[28px] ring-1 ring-os-line bg-os-paper shadow-os overflow-hidden">
            <div className="relative bg-gradient-to-r from-os-blue to-os-indigo px-8 py-10 text-white">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 mb-4">
                <Radio className="h-6 w-6" />
              </div>
              <h1 className="font-serif-display text-[28px] sm:text-[32px] font-semibold tracking-tight">{t({ zh: '益语的朋友们 · 直播讨论', en: 'Friends of Yiyu · Live Discussions' })}</h1>
              <p className="mt-2 text-white/80 text-[14px] leading-7 max-w-xl">
                {t({ zh: '和益语智库的朋友们一起，围绕社会创新的真实议题边做边聊——把好问题摆上台面，把好做法讲清楚。', en: 'Join the friends of Yiyu Institute for hands-on conversations around real social-innovation challenges—surfacing the right questions and making good practices clear.' })}
              </p>
            </div>

            <div className="px-8 py-9">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-os-mist px-3 py-1 text-[12px] font-semibold text-os-blue ring-1 ring-os-blue/20">
                <Sparkles className="h-3.5 w-3.5" />{t({ zh: '内容筹备中', en: 'Content in Preparation' })}
              </div>
              <p className="mt-4 text-[15px] leading-8 text-os-muted">
                {t({ zh: '这个栏目的详情页正在设计中。终身会员将可参与每期直播讨论、回看往期内容、并向嘉宾提问。正式上线后，这里会呈现：直播排期、往期回放、嘉宾阵容与报名入口。', en: 'This page is still being designed. Lifetime members will be able to join every live session, watch past episodes, and ask guests questions. Once launched, it will feature the live schedule, recordings, guest lineup, and registration.' })}
              </p>
            </div>
          </div>
        </div>
      </main>

      <OpenSourceFooter />
    </div>
  );
}
