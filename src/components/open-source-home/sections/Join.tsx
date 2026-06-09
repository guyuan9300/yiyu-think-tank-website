import { useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Container, Section, SectionHeading, Button, Reveal } from '../ui';
import { PARTICIPATE } from '../links';
import { useLang, type Bilingual } from '../../../lib/i18n';
import { ActionerModal } from './ActionerModal';
import { DeveloperModal } from './DeveloperModal';
import { SupporterModal } from './SupporterModal';
import { FunderModal } from './FunderModal';

type GlyphProps = { className?: string };
const SVG = (props: { className?: string; children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={props.className} aria-hidden="true">
    {props.children}
  </svg>
);
// 4 个定制线性图标(品牌细线风格);hover 各有贴合且细致的动画(keyframes 在 Join 的 <style>)
const ActionerGlyph = ({ className }: GlyphProps) => ( // 纸飞机:hover 飞走 + 三道尾流流动
  <SVG className={className}>
    <g>
      <path d="M6.2 14.5 3.8 16.9" className="opacity-0 group-hover:[animation:joinTrail_1.1s_ease-in-out_infinite]" />
      <path d="M8.4 13 6 15.4" className="opacity-0 group-hover:[animation:joinTrail_1.1s_ease-in-out_infinite] [animation-delay:0.14s]" />
      <path d="M4.4 16.6 2.4 18.6" className="opacity-0 group-hover:[animation:joinTrail_1.1s_ease-in-out_infinite] [animation-delay:0.28s]" />
    </g>
    <g className="origin-center [transform-box:fill-box] group-hover:[animation:joinFly_1.2s_ease-in-out_infinite]">
      <path d="M21 3 10.3 13.7" /><path d="M21 3 14.4 21 10.3 13.7 3 9.6 21 3Z" />
    </g>
  </SVG>
);
const DeveloperGlyph = ({ className }: GlyphProps) => ( // 代码 </> + 光标:hover 光标闪烁(写代码)
  <SVG className={className}>
    <path d="M8 8 4.5 12 8 16" /><path d="M16 8 19.5 12 16 16" /><path d="M13.2 6.8 10.8 17.2" />
    <path d="M21 8.5v7" className="opacity-0 group-hover:[animation:joinBlink_0.9s_steps(1,end)_infinite]" />
  </SVG>
);
const SupporterGlyph = ({ className }: GlyphProps) => ( // 两个并肩的人 = 同行者;hover 交替迈步
  <SVG className={className}>
    <g className="group-hover:[animation:joinStep_0.7s_ease-in-out_infinite]"><circle cx="8.4" cy="7" r="2.1" /><path d="M5.2 18v-1.7a3.2 3.2 0 0 1 6.4 0V18" /></g>
    <g className="group-hover:[animation:joinStep_0.7s_ease-in-out_infinite] [animation-delay:0.35s]"><circle cx="15.6" cy="7" r="2.1" /><path d="M12.4 18v-1.7a3.2 3.2 0 0 1 6.4 0V18" /></g>
  </SVG>
);
const FunderGlyph = ({ className }: GlyphProps) => ( // 电池 + 三格:hover 一格→二格→三格逐格充满
  <SVG className={className}>
    <rect x="2.5" y="7.5" width="15" height="9" rx="2.5" /><path d="M20.5 11v2" />
    <rect x="5" y="9.8" width="2.4" height="4.4" rx="0.6" fill="currentColor" stroke="none" className="opacity-[0.18] group-hover:[animation:joinChargeBar_1.6s_ease-in-out_infinite]" />
    <rect x="8.6" y="9.8" width="2.4" height="4.4" rx="0.6" fill="currentColor" stroke="none" className="opacity-[0.18] group-hover:[animation:joinChargeBar_1.6s_ease-in-out_infinite] [animation-delay:0.32s]" />
    <rect x="12.2" y="9.8" width="2.4" height="4.4" rx="0.6" fill="currentColor" stroke="none" className="opacity-[0.18] group-hover:[animation:joinChargeBar_1.6s_ease-in-out_infinite] [animation-delay:0.64s]" />
  </SVG>
);

type Variant = 'primary' | 'secondary' | 'spark';
type Entry = {
  role: Bilingual;
  Glyph: (props: GlyphProps) => JSX.Element;
  fit: Bilingual;
  lead?: boolean; // true: fit 是一句开放邀请语(不加「适合：」前缀,且作为卡片主体,无 can 明细)
  can?: Bilingual;
  cta: Bilingual;
  variant: Variant;
  link: { href: string; external?: boolean };
};
// 4 个角色组成一条价值链:行动者出题 → 开发者造工具 → 支持方供资源 → 资助方供能。
const ENTRIES: Entry[] = [
  {
    role: { zh: '我是行动者', en: 'I am an Actioner' },
    Glyph: ActionerGlyph,
    lead: true,
    fit: { zh: '如果你有一个改变世界、让社会变得更好的梦想，而且已经付诸行动 —— 告诉我们，我们会尽其所能支持你。', en: 'If you have a dream to make the world better, and you’ve already taken action — tell us, and we’ll do everything we can to back you.' },
    cta: { zh: '提交我的行动方案', en: 'Submit My Action Plan' },
    variant: 'primary',
    link: PARTICIPATE.actioner,
  },
  {
    role: { zh: '我是开发者 · 技术伙伴', en: 'I am a Developer · Tech Partner' },
    Glyph: DeveloperGlyph,
    lead: true,
    fit: { zh: '有非常多的公益组织和有理想的年轻人，希望用更有效率、更现代的技术去解决社会问题、让社会变得更美好。如果你愿意支持他们，来看看可以和我们一起做什么。', en: 'So many nonprofits and idealistic young people want to use more efficient, more modern technology to solve social problems and make society better. If you’re willing to support them, come see what we can build together.' },
    cta: { zh: '认领一个模块', en: 'Claim a Module' },
    variant: 'secondary',
    link: PARTICIPATE.developer,
  },
  {
    role: { zh: '我是支持方', en: 'I am a Supporter' },
    Glyph: SupporterGlyph,
    lead: true,
    fit: { zh: '改变世界，常常是很孤单的一件事。如果你能提供一些资源、场地，或任何能帮勇敢者加速向前的东西 —— 非常欢迎你成为同行者。', en: 'Changing the world is often a lonely thing. If you can offer some resources, a space, or anything that helps the brave move forward faster — you’re warmly welcome to walk alongside us.' },
    cta: { zh: '成为同行者', en: 'Walk Alongside Us' },
    variant: 'secondary',
    link: PARTICIPATE.merchant,
  },
  {
    role: { zh: '我是资助方', en: 'I am a Funder' },
    Glyph: FunderGlyph,
    lead: true,
    fit: { zh: '益语智库社区和勇敢的行动者，都需要更多人一起来加电。我们要的不只是出钱的人 —— 我们希望每个人都能在一件真实的事里，获得共赢。', en: 'The Yiyu community and its brave actioners need more people to power them up. We don’t just need people who write cheques — we hope everyone wins together inside something real.' },
    cta: { zh: '为社区加电', en: 'Power Up the Community' },
    variant: 'spark',
    link: PARTICIPATE.supporter,
  },
];

function RoleCard({ entry, index, onCta }: { entry: Entry; index: number; onCta?: () => void }) {
  const { t } = useLang();
  const Glyph = entry.Glyph;
  const ref = useRef<HTMLDivElement>(null);
  const spark = entry.variant === 'spark';

  // 鼠标光斑跟随:把指针坐标写进 CSS 变量,叠加层用它定位 radial 光斑
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      style={{ '--mx': '50%', '--my': '0%' } as CSSProperties}
      className="group relative h-full overflow-hidden rounded-[22px] bg-os-paper ring-1 ring-os-line shadow-os transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[6px] hover:shadow-os-lg hover:ring-os-navy/15"
    >
      {/* 顶部渐变发丝线:hover 亮起 */}
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${
          spark ? 'bg-gradient-to-r from-transparent via-os-spark/55 to-transparent' : 'bg-gradient-to-r from-transparent via-os-blue/45 to-transparent'
        }`}
      />
      {/* 鼠标光斑:仅 hover 可见,跟随指针 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at var(--mx) var(--my), ${spark ? 'rgba(124,58,237,0.10)' : 'rgba(44,111,208,0.09)'}, transparent 62%)`,
        }}
      />
      {/* 角标序号:编辑感留白 */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-6 top-5 select-none font-serif-display text-[40px] leading-none text-os-navy/[0.05] transition-colors duration-500 group-hover:text-os-navy/[0.09]"
      >
        0{index + 1}
      </span>

      <div className="relative flex h-full flex-col p-7">
        {/* 图标牌:横向长方形(矮一些,卡片不显长),hover 微浮 + 柔光;图标各有专属动画 */}
        <div
          className={`mb-6 flex h-[42px] w-[60px] items-center justify-center rounded-[13px] ring-1 transition-[transform,box-shadow] duration-500 group-hover:-translate-y-0.5 ${
            spark
              ? 'bg-os-spark-soft text-os-spark ring-os-spark/20 group-hover:shadow-[0_12px_24px_-10px_rgba(124,58,237,0.50)]'
              : 'bg-os-mist text-os-blue ring-os-blue/15 group-hover:shadow-[0_12px_24px_-10px_rgba(44,111,208,0.45)]'
          }`}
        >
          <Glyph className="h-[26px] w-[26px]" />
        </div>

        <h3 className="mb-3 font-serif-display text-[20px] font-semibold tracking-tight text-os-navy">{t(entry.role)}</h3>

        {entry.lead ? (
          <p className="flex-1 text-[14px] leading-[1.85] text-os-muted">{t(entry.fit)}</p>
        ) : (
          <>
            <p className="mb-3 text-[12.5px] leading-relaxed text-os-muted/90">
              <span className="font-semibold text-os-ink/70">{t({ zh: '适合：', en: 'For: ' })}</span>
              {t(entry.fit)}
            </p>
            <p className="flex-1 text-[14px] leading-[1.75] text-os-muted">{entry.can ? t(entry.can) : ''}</p>
          </>
        )}

        <div className="mt-7">
          {onCta ? (
            <Button onClick={onCta} variant={entry.variant} className="w-full">
              {t(entry.cta)}
            </Button>
          ) : (
            <Button href={entry.link.href} external={entry.link.external} variant={entry.variant} className="w-full">
              {t(entry.cta)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Join() {
  const { t } = useLang();
  const [actionerOpen, setActionerOpen] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [supporterOpen, setSupporterOpen] = useState(false);
  const [funderOpen, setFunderOpen] = useState(false);
  return (
    <Section id="join" tone="canvas">
      <Container>
        <style>{`
          @keyframes joinFly {0%{transform:translate(0,0) rotate(0);opacity:1}55%{transform:translate(8px,-9px) rotate(14deg);opacity:0}56%{transform:translate(-8px,8px) rotate(0);opacity:0}100%{transform:translate(0,0) rotate(0);opacity:1}}
          @keyframes joinTrail {0%{opacity:0;transform:translate(0,0)}35%{opacity:0.6}100%{opacity:0;transform:translate(-3px,3px)}}
          @keyframes joinBlink {0%,49%{opacity:1}50%,100%{opacity:0}}
          @keyframes joinStep {0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}
          @keyframes joinChargeBar {0%{opacity:0.18}25%{opacity:1}85%{opacity:1}100%{opacity:0.18}}
        `}</style>
        <SectionHeading
          eyebrow={t({ zh: '加入我们', en: 'Join Us' })}
          title={t({ zh: '一起为行动者加电', en: 'Power up actioners, together' })}
          subtitle={t({ zh: '益语智库不是一个人或一个团队能完成的产品。行动者提出真实需求，开发者把它变成 AI 模块，支持方供资源、资助方供能，益语负责价值观、架构、认证与分发。', en: 'Yiyu Institute is not a product one person or one team can finish. Actioners raise real needs, developers turn them into AI modules, supporters provide resources, funders provide power, and Yiyu handles the values, architecture, certification, and distribution.' })}
        />

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ENTRIES.map((e, i) => (
            <Reveal key={e.role.zh} delay={(i % 4) * 80}>
              <RoleCard entry={e} index={i} onCta={i === 0 ? () => setActionerOpen(true) : i === 1 ? () => setDeveloperOpen(true) : i === 2 ? () => setSupporterOpen(true) : () => setFunderOpen(true)} />
            </Reveal>
          ))}
        </div>

        {/* 价值宣言：整宽 navy 带（收尾） */}
        <Reveal delay={120}>
          <div className="mt-8 rounded-[20px] bg-os-navy text-white p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="font-serif-display text-[20px] leading-[1.5] shrink-0">
              {t({ zh: '为行动加电，', en: 'Powering action,' })}<br />{t({ zh: '不是冷冰冰的募捐。', en: 'not cold fundraising.' })}
            </p>
            <p className="text-[14px] leading-[1.8] text-white/70 sm:max-w-[58%]">
              {t({ zh: '每一份支持都对应一个真实行动者、一个真实模块、一段真实进展。益语负责把它透明地记录下来。', en: 'Every contribution maps to a real actioner, a real module, and real progress. Yiyu records it all transparently.' })}
            </p>
          </div>
        </Reveal>
      </Container>

      <ActionerModal open={actionerOpen} onClose={() => setActionerOpen(false)} />
      <DeveloperModal open={developerOpen} onClose={() => setDeveloperOpen(false)} />
      <SupporterModal open={supporterOpen} onClose={() => setSupporterOpen(false)} />
      <FunderModal open={funderOpen} onClose={() => setFunderOpen(false)} />
    </Section>
  );
}
