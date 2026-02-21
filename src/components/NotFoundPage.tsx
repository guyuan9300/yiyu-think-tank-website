import { AlertTriangle, Home } from 'lucide-react';

export function NotFoundPage({ unknownPage, onGoHome }: { unknownPage?: string; onGoHome: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-xl w-full glass rounded-3xl p-10 border border-border/30 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">页面不存在</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              你打开的链接目前无法识别。
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
                返回首页
              </button>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border/40 text-sm hover:bg-muted/30 transition"
              >
                返回上一页
              </button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              如果这是一个旧链接，请把地址发给我们，我们会补齐跳转。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
