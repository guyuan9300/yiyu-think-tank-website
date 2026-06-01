import { AlertTriangle, Home } from 'lucide-react';
import { useLang } from '../lib/i18n';

export function NotFoundPage({ unknownPage, onGoHome }: { unknownPage?: string; onGoHome: () => void }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-xl w-full glass rounded-3xl p-10 border border-border/30 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif-display text-[28px] sm:text-[32px] font-semibold tracking-tight text-os-ink">{t({ zh: '页面不存在', en: 'Page Not Found' })}</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {t({ zh: '你打开的链接目前无法识别。', en: 'We could not recognize the link you opened.' })}
              {unknownPage ? (
                <>
                  <span className="ml-1">（page=</span>
                  <span className="font-mono">{unknownPage}</span>
                  <span>）</span>
                </>
              ) : null}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onGoHome}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
              >
                <Home className="w-4 h-4" />
                {t({ zh: '返回首页', en: 'Back to Home' })}
              </button>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border/40 text-sm hover:bg-muted/30 transition"
              >
                {t({ zh: '返回上一页', en: 'Go Back' })}
              </button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              {t({ zh: '如果这是一个旧链接，请把地址发给我们，我们会补齐跳转。', en: 'If this is an old link, send us the URL and we will set up the redirect.' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
