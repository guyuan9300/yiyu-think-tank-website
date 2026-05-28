import { Container } from './ui';
import { ANCHORS, GITHUB_URL, FUTURE_ROUTES, LEGAL } from './links';

type FootLink = { label: string; href: string; external?: boolean };

const GROUPS: { title: string; links: FootLink[] }[] = [
  {
    title: '产品',
    links: [
      { label: '下载开源版', href: ANCHORS.download },
      { label: '功能模块', href: FUTURE_ROUTES.features },
      { label: 'Roadmap', href: ANCHORS.roadmap },
    ],
  },
  {
    title: '行动者',
    links: [
      { label: '行动者故事', href: FUTURE_ROUTES.stories },
      { label: '提交需求', href: ANCHORS.join },
      { label: '申请加电', href: ANCHORS.join },
    ],
  },
  {
    title: '共建',
    links: [
      { label: 'GitHub', href: GITHUB_URL, external: true },
      { label: '参与模块共建', href: GITHUB_URL, external: true },
      { label: '问题反馈', href: `${GITHUB_URL}/issues`, external: true },
    ],
  },
  {
    title: '关于益语',
    links: [
      { label: '智库介绍', href: '?page=about' },
      { label: '战略咨询', href: '?page=strategy' },
      { label: '研究报告', href: '?page=report-library' },
      { label: '联系方式', href: LEGAL.contact.href },
    ],
  },
  {
    title: '规则',
    links: [
      { label: '开源协议', href: LEGAL.license.href, external: true },
      { label: '隐私说明', href: LEGAL.privacy.href },
      { label: '安全边界', href: LEGAL.security.href },
      { label: '品牌使用规范', href: LEGAL.brand.href },
    ],
  },
];

export function OpenSourceFooter() {
  return (
    <footer className="bg-[#0B1E36] text-white/70 border-t border-white/10">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          {/* 品牌 + 组织身份 */}
          <div className="max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-[10px] overflow-hidden ring-1 ring-white/15 bg-white/5 flex items-center justify-center">
                <img src={`${import.meta.env.BASE_URL}yiyu-avatar.png`} alt="益语智库" className="w-full h-full object-cover" />
              </span>
              <span className="leading-tight">
                <span className="block font-serif-display text-[16px] font-semibold text-white">益语智库</span>
                <span className="block text-[10.5px] tracking-[0.12em] text-white/45">YIYU THINKTANK</span>
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-white/60">
              益语智库是一家战略咨询与公益行业研究机构，我们用技术表达管理思想，帮助组织和行动者更好地完成重要的事。
            </p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/40">
              Open Source for Actioners — 把组织复杂行动的 AI 后台能力，开源交还给更多普通行动者。
            </p>
          </div>

          {/* 链接组 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <div className="text-[13px] font-semibold text-white/90 mb-4">{g.title}</div>
                <ul className="space-y-2.5">
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="text-[13.5px] text-white/55 hover:text-white transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12.5px] text-white/45">© 2026 益语智库 YiYu ThinkTank · 开源项目</p>
          <p className="text-[12.5px] text-white/45">AI 做整理、找证据、起草材料；人类负责判断、确认和行动。</p>
        </div>
      </Container>
    </footer>
  );
}
