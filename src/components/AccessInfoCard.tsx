import { ShieldCheck, User, UserPlus, Crown } from 'lucide-react';

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
  return (
    <div className={`rounded-3xl border border-border/40 bg-white/70 backdrop-blur-sm shadow-sm ${className}`}>
      <div className={`p-6 ${compact ? 'sm:p-6' : 'sm:p-8'}`}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold tracking-tight">内容访问权限说明</h3>
            <p className="text-[13px] text-muted-foreground/70 mt-1 leading-relaxed">
              这是建造期的统一规则说明（先讲清楚，再逐步实现自动权限控制）。
            </p>

            <div className={`mt-5 grid gap-3 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-3'}`}>
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground/70" />
                  <span className="text-[13px] font-medium">访客（未注册）</span>
                </div>
                <ul className="text-[12px] text-muted-foreground/75 leading-relaxed list-disc pl-5 space-y-1">
                  <li>可浏览大部分公开内容</li>
                  <li>不含前沿洞察/战略陪伴里的报告全文</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground/70" />
                  <span className="text-[13px] font-medium">注册会员（未付费）</span>
                </div>
                <ul className="text-[12px] text-muted-foreground/75 leading-relaxed list-disc pl-5 space-y-1">
                  <li>在访客基础上</li>
                  <li>可预览各类报告前 20%</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-primary/80" />
                  <span className="text-[13px] font-medium">付费会员</span>
                </div>
                <ul className="text-[12px] text-muted-foreground/75 leading-relaxed list-disc pl-5 space-y-1">
                  <li>可查看所有内容</li>
                  <li>含报告全文与战略陪伴资源</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 text-[12px] text-muted-foreground/60">
              注：具体“注册/付费/权限控制”会在后续联调中逐步上线；目前先统一展示规则，避免误导。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
