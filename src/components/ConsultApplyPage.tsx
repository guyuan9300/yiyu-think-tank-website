import { ArrowLeft, ExternalLink, Mail, Phone, Sparkles } from 'lucide-react';
import { Header } from './Header';
import { DIAGNOSIS_FORM_URL, SITE_CONTACT_EMAIL, SITE_CONTACT_PHONE } from '../lib/siteMeta';

interface ConsultApplyPageProps {
  onBack?: () => void;
}

export function ConsultApplyPage({ onBack }: ConsultApplyPageProps) {
  const feishuFormUrl = ((import.meta as any).env?.VITE_FEISHU_FORM_URL as string | undefined)?.trim() || DIAGNOSIS_FORM_URL;

  return (
    <div className="min-h-screen bg-background">
      <Header
        isLoggedIn={false}
        userType="visitor"
        onNavigate={(page) => {
          if (page === 'home') onBack?.();
        }}
      />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onBack?.()}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </button>

          <div className="rounded-[32px] border border-border/40 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">申请战略咨询</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground/75">
                  这一入口已经切到正式收集链路。为了避免本地演示表单和真实提交状态不一致，
                  现在统一通过飞书表单收集咨询需求；若你暂时不方便提交，也可以直接通过电话或邮箱联系我们。
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),280px]">
              <section className="rounded-[28px] border border-primary/15 bg-primary/5 p-6">
                <h2 className="text-lg font-semibold text-foreground">正式提交方式</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground/75">
                  建议直接填写飞书表单。这样你提交的信息会进入正式收集流程，便于后续评估、跟进与归档。
                </p>

                <div className="mt-5 space-y-3 text-sm text-muted-foreground/75">
                  <div>适合提交的问题类型：</div>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>组织战略梳理与目标校准</li>
                    <li>组织协作、管理机制与流程重构</li>
                    <li>数字化与 AI 在组织中的落地应用</li>
                  </ul>
                </div>

                <a
                  href={feishuFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  打开正式申请表
                  <ExternalLink className="h-4 w-4" />
                </a>
              </section>

              <aside className="rounded-[28px] border border-border/50 bg-white p-6">
                <h2 className="text-lg font-semibold text-foreground">直接联系</h2>
                <div className="mt-5 space-y-4 text-sm">
                  <a
                    href={`tel:${SITE_CONTACT_PHONE}`}
                    className="flex items-start gap-3 rounded-2xl border border-border/50 px-4 py-3 text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                  >
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground/60">联系电话</div>
                      <div className="font-medium">{SITE_CONTACT_PHONE}</div>
                    </div>
                  </a>

                  <a
                    href={`mailto:${SITE_CONTACT_EMAIL}`}
                    className="flex items-start gap-3 rounded-2xl border border-border/50 px-4 py-3 text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                  >
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground/60">联系邮箱</div>
                      <div className="font-medium break-all">{SITE_CONTACT_EMAIL}</div>
                    </div>
                  </a>
                </div>

                <p className="mt-5 text-xs leading-relaxed text-muted-foreground/60">
                  当前官网已停用本地备用表单，避免出现“用户以为已经提交成功，但后台并没有正式记录”的情况。
                </p>
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
