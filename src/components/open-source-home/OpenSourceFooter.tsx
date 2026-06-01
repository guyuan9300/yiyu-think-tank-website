import { Container } from './ui';
import { ANCHORS, GITHUB_URL, FUTURE_ROUTES, LEGAL } from './links';
import { useLang, type Bilingual } from '../../lib/i18n';

type FootLink = { label: Bilingual; href: string; external?: boolean };

const GROUPS: { title: Bilingual; links: FootLink[] }[] = [
  {
    title: { zh: '产品', en: 'Product' },
    links: [
      { label: { zh: '下载开源版', en: 'Download Open Source' }, href: ANCHORS.download },
      { label: { zh: '功能模块', en: 'Modules' }, href: FUTURE_ROUTES.features },
      { label: { zh: 'Roadmap', en: 'Roadmap' }, href: ANCHORS.roadmap },
    ],
  },
  {
    title: { zh: '行动者', en: 'Changemakers' },
    links: [
      { label: { zh: '行动者故事', en: 'Changemaker Stories' }, href: FUTURE_ROUTES.stories },
      { label: { zh: '提交需求', en: 'Submit a Request' }, href: ANCHORS.join },
      { label: { zh: '申请加电', en: 'Apply for a Boost' }, href: ANCHORS.join },
    ],
  },
  {
    title: { zh: '共建', en: 'Contribute' },
    links: [
      { label: { zh: 'GitHub', en: 'GitHub' }, href: GITHUB_URL, external: true },
      { label: { zh: '参与模块共建', en: 'Build Modules With Us' }, href: GITHUB_URL, external: true },
      { label: { zh: '问题反馈', en: 'Report an Issue' }, href: `${GITHUB_URL}/issues`, external: true },
    ],
  },
  {
    title: { zh: '关于益语', en: 'About Yiyu' },
    links: [
      { label: { zh: '智库介绍', en: 'About the Institute' }, href: '?page=about' },
      { label: { zh: '战略咨询', en: 'Strategy Consulting' }, href: '?page=strategy' },
      { label: { zh: '研究报告', en: 'Research Reports' }, href: '?page=report-library' },
      { label: { zh: '联系方式', en: 'Contact' }, href: LEGAL.contact.href },
    ],
  },
  {
    title: { zh: '规则', en: 'Policies' },
    links: [
      { label: { zh: '开源协议', en: 'Open Source License' }, href: LEGAL.license.href, external: true },
      { label: { zh: '隐私说明', en: 'Privacy Notice' }, href: LEGAL.privacy.href },
      { label: { zh: '安全边界', en: 'Security Boundaries' }, href: LEGAL.security.href },
      { label: { zh: '品牌使用规范', en: 'Brand Guidelines' }, href: LEGAL.brand.href },
    ],
  },
];

export function OpenSourceFooter() {
  const { t } = useLang();
  return (
    <footer className="bg-[#0B1E36] text-white/70 border-t border-white/10">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          {/* 品牌 + 组织身份 */}
          <div className="max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-[10px] overflow-hidden ring-1 ring-white/15 bg-white/5 flex items-center justify-center">
                <img src={`${import.meta.env.BASE_URL}yiyu-avatar.png`} alt={t({ zh: '益语智库', en: 'Yiyu Institute' })} className="w-full h-full object-cover" />
              </span>
              <span className="leading-tight">
                <span className="block font-serif-display text-[16px] font-semibold text-white">{t({ zh: '益语智库', en: 'Yiyu Institute' })}</span>
                <span className="block text-[10.5px] tracking-[0.12em] text-white/45">YIYU THINKTANK</span>
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-white/60">
              {t({ zh: '益语智库是一家战略咨询与公益行业研究机构，我们用技术表达管理思想，帮助组织和行动者更好地完成重要的事。', en: 'Yiyu Institute is a strategy consulting and nonprofit-sector research organization. We express management thinking through technology to help organizations and changemakers do important work better.' })}
            </p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/40">
              {t({ zh: 'Open Source for Actioners — 把组织复杂行动的 AI 后台能力，开源交还给更多普通行动者。', en: 'Open Source for Actioners — returning the AI back-office power for complex organizational action to everyday changemakers.' })}
            </p>
          </div>

          {/* 链接组 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            {GROUPS.map((g) => (
              <div key={g.title.zh}>
                <div className="text-[13px] font-semibold text-white/90 mb-4">{t(g.title)}</div>
                <ul className="space-y-2.5">
                  {g.links.map((l) => (
                    <li key={l.label.zh}>
                      <a
                        href={l.href}
                        {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="text-[13.5px] text-white/55 hover:text-white transition-colors"
                      >
                        {t(l.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12.5px] text-white/45">{t({ zh: '© 2026 益语智库 YiYu ThinkTank · 开源项目', en: '© 2026 Yiyu Institute · Open-source project' })}</p>
          <p className="text-[12.5px] text-white/45">{t({ zh: 'AI 做整理、找证据、起草材料；人类负责判断、确认和行动。', en: 'AI organizes, finds evidence, and drafts; humans judge, confirm, and act.' })}</p>
        </div>
      </Container>
    </footer>
  );
}
