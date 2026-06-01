import { useEffect, useState } from 'react';
import { Section, Container, Reveal } from '../ui';
import { fetchCaseShowcases, type CaseShowcase } from '../../../lib/caseShowcaseApi';
import { useLang, type Bilingual } from '../../../lib/i18n';

// ============================================================
// 客户 logo 墙 · 经典成熟 + 科技感
//   做法参考 Stripe / Vercel 客户墙:
//   - 极淡网格点阵背景 (科技底纹)
//   - logo 白卡: 默认灰度+低透明 → hover 彩色 + 上浮 + 冷蓝光环
//   数据: fetchCaseShowcases('published') 真实客户; 失败回退本地静态名单。
// ============================================================

interface ClientLogo {
  name: string;
  logo: string;
  desc?: string;
}

// 本地回退 (后端不可达时仍能展示)。name 为机构名(专有名词, 不翻); desc 双语。
interface FallbackLogo {
  name: Bilingual;
  logo: string;
  desc: Bilingual;
}
const FALLBACK_LOGOS: FallbackLogo[] = [
  { name: { zh: '蓝信封', en: 'Blue Envelope' }, logo: '/images/cases/blue-letter.png', desc: { zh: '乡村儿童书信陪伴', en: 'Letter companionship for rural children' } },
  { name: { zh: '日慈基金会', en: 'Rici Foundation' }, logo: '/images/cases/rici-foundation.png', desc: { zh: '青少年心智素养教育', en: 'Social-emotional learning for youth' } },
  { name: { zh: '中国乡村发展基金会', en: 'China Rural Development Foundation' }, logo: '/images/cases/china-rural-foundation.png', desc: { zh: '乡村发展与扶贫', en: 'Rural development and poverty relief' } },
  { name: { zh: '愿景资本', en: 'Vision Capital' }, logo: '/images/cases/vision-capital.png', desc: { zh: '早中期产业创投', en: 'Early- and growth-stage venture capital' } },
  { name: { zh: '贝石基金会', en: 'Beishi Foundation' }, logo: '/images/cases/beike-foundation.png', desc: { zh: '社区公益平台', en: 'Community philanthropy platform' } },
  { name: { zh: '田字格', en: 'Tianzige' }, logo: '/images/cases/tianzige.png', desc: { zh: '乡土人本教育', en: 'Rooted, human-centered rural education' } },
  { name: { zh: '蔚来', en: 'NIO' }, logo: '/images/cases/nio.png', desc: { zh: '企业社会责任', en: 'Corporate social responsibility' } },
  { name: { zh: '善加公益', en: 'Shanjia' }, logo: '/images/cases/abc-consulting.png', desc: { zh: '组织发展与 AI 运营', en: 'Organizational development and AI operations' } },
  { name: { zh: '校园足球公益', en: 'Campus Football Initiative' }, logo: '/images/cases/lithium-sodium-krypton-strontium.png', desc: { zh: '体育公益项目', en: 'Sports-for-good program' } },
];

export function ClientLogoWall() {
  const { t } = useLang();
  // API 加载成功前为 null, 此时用双语回退名单(随语言实时切换); 成功后用真实数据。
  const [apiLogos, setApiLogos] = useState<ClientLogo[] | null>(null);
  const fallbackLogos: ClientLogo[] = FALLBACK_LOGOS.map((l) => ({
    name: t(l.name),
    logo: l.logo,
    desc: t(l.desc),
  }));
  const logos = apiLogos ?? fallbackLogos;

  useEffect(() => {
    let alive = true;
    fetchCaseShowcases('published')
      .then((res) => {
        if (!alive || !res.ok || !res.data?.length) return;
        const mapped = res.data
          .filter((c: CaseShowcase) => c.logoUrl)
          .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
          .map((c: CaseShowcase) => ({
            name: c.clientName,
            logo: c.logoUrl as string,
            desc: c.title || c.subtitle || (c.tags || []).join(' · '),
          }));
        if (mapped.length) setApiLogos(mapped);
      })
      .catch(() => {/* 保留回退名单 */});
    return () => { alive = false; };
  }, []);

  return (
    <Section id="clients" tone="paper" className="relative overflow-hidden">
      {/* 科技感: 极淡网格点阵底纹 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(22,38,94,0.06) 1px, transparent 0)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 45%, #000 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 45%, #000 55%, transparent 100%)',
        }}
      />

      <Container className="relative">
        <Reveal>
          <div className="text-center">
            <div className="inline-flex items-center gap-2.5 mb-5">
              <span className="h-px w-7 bg-os-blue/50" />
              <span className="text-[12px] font-semibold tracking-[0.18em] text-os-blue uppercase">{t({ zh: '受这些组织信任', en: 'Trusted by These Organizations' })}</span>
              <span className="h-px w-7 bg-os-blue/50" />
            </div>
            <h2 className="font-serif-display text-[26px] sm:text-[34px] lg:text-[40px] font-semibold leading-[1.25] tracking-tight text-os-navy">
              {t({ zh: '已为 60+ 家组织提供战略陪伴', en: 'Strategy companionship for 60+ organizations' })}
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-[15px] leading-7 text-os-muted">
              {t({ zh: '从公益基金会、社会创新组织，到创投机构与企业——益语智库陪伴他们看清方向、重构路径、把战略真正落进组织日常。', en: 'From foundations and social-innovation organizations to venture firms and enterprises — Yiyu Institute helps them see their direction, redesign their path, and land strategy in everyday work.' })}
            </p>
          </div>
        </Reveal>

        {/* logo 网格 */}
        <Reveal delay={120}>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {logos.map((c) => (
              <div
                key={c.name}
                className="group relative flex flex-col items-center justify-center rounded-2xl border border-os-line bg-os-paper px-4 py-7 shadow-[0_1px_2px_rgba(22,38,94,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-os-blue/40 hover:shadow-[0_24px_50px_-28px_rgba(44,111,208,0.45)]"
              >
                {/* hover 冷蓝光环 */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(44,111,208,0.07),transparent_70%)]" />
                <img
                  src={c.logo}
                  alt={c.name}
                  className="relative h-12 sm:h-14 w-auto max-w-[160px] object-contain opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  loading="lazy"
                />
                <div className="relative mt-3 text-center">
                  <div className="text-[13px] font-semibold text-os-ink/80 transition-colors group-hover:text-os-navy">{c.name}</div>
                  {c.desc && (
                    <div className="mt-0.5 text-[11.5px] leading-4 text-os-muted/0 transition-colors duration-300 group-hover:text-os-muted/75">
                      {c.desc}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-8 text-center text-[12.5px] text-os-muted/60">
            {t({ zh: '部分客户与合作伙伴 · 排名不分先后', en: 'Selected clients and partners · in no particular order' })}
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
