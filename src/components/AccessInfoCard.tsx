import { ShieldCheck, User, UserPlus, Crown } from 'lucide-react';
import { useLang } from '../lib/i18n';

/**
 * 通用可见的“权限说明卡片”（建造期：只做说明，不做 gating）。
 */
export function AccessInfoCard({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className={`rounded-3xl border border-border/40 bg-white/70 backdrop-blur-sm shadow-sm ${className}`}>
      <div className={`p-6 ${compact ? 'sm:p-6' : 'sm:p-8'}`}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold tracking-tight">{t({ zh: '内容访问权限说明', en: 'Content Access Rules' })}</h3>
            <p className="text-[13px] text-muted-foreground/70 mt-1 leading-relaxed">
              {t({ zh: '这是建造期的统一规则说明（先讲清楚，再逐步实现自动权限控制）。', en: 'A unified rule overview during the build phase (explained first, with automatic access control rolled out progressively).' })}
            </p>

            <div className={`mt-5 grid gap-3 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-3'}`}>
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground/70" />
                  <span className="text-[13px] font-medium">{t({ zh: '访客（未注册）', en: 'Visitor (not registered)' })}</span>
                </div>
                <ul className="text-[12px] text-muted-foreground/75 leading-relaxed list-disc pl-5 space-y-1">
                  <li>{t({ zh: '可浏览大部分公开内容', en: 'Can browse most public content' })}</li>
                  <li>{t({ zh: '不含前沿洞察/战略陪伴里的报告全文', en: 'Excludes full reports in Insights / Strategic Companion' })}</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground/70" />
                  <span className="text-[13px] font-medium">{t({ zh: '注册会员（未付费）', en: 'Registered member (free)' })}</span>
                </div>
                <ul className="text-[12px] text-muted-foreground/75 leading-relaxed list-disc pl-5 space-y-1">
                  <li>{t({ zh: '在访客基础上', en: 'In addition to visitor access' })}</li>
                  <li>{t({ zh: '可预览各类报告前 20%', en: 'Can preview the first 20% of all reports' })}</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-primary/80" />
                  <span className="text-[13px] font-medium">{t({ zh: '付费会员（298元/年）', en: 'Paid member (¥298/year)' })}</span>
                </div>
                <ul className="text-[12px] text-muted-foreground/75 leading-relaxed list-disc pl-5 space-y-1">
                  <li>{t({ zh: '可查看所有内容', en: 'Access to all content' })}</li>
                  <li>{t({ zh: '含报告全文与战略陪伴资源', en: 'Includes full reports and Strategic Companion resources' })}</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 text-[12px] text-muted-foreground/60">
              {t({ zh: '注：具体“注册/付费/权限控制”会在后续联调中逐步上线；目前先统一展示规则，避免误导。', en: 'Note: registration, payment, and access control will roll out progressively in later integration; for now the rules are shown together to avoid confusion.' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
