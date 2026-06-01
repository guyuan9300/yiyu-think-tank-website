import { Container, Reveal } from '../ui';
import { useLang } from '../../../lib/i18n';

// 深蓝金句暗场带：打断淡色卡片节奏的"重音"，承接行动者启示的思想收束。
export function QuoteBand() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden bg-os-navy py-20 sm:py-24 lg:py-28">
      {/* 紫/蓝光晕，制造层次，非霓虹 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[60%] h-[120%] rounded-full bg-os-indigo/25 blur-[130px]" />
        <div className="absolute bottom-[-50%] right-[6%] w-[34%] h-[120%] rounded-full bg-os-violet/20 blur-[130px]" />
      </div>

      <Container className="relative">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-2.5 mb-7">
              <span className="h-px w-7 bg-os-violet/70" />
              <span className="text-[12px] font-semibold tracking-[0.2em] text-os-violet/90">{t({ zh: '与行动者同行', en: 'Standing with Actioners' })}</span>
              <span className="h-px w-7 bg-os-violet/70" />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <p className="font-serif-display text-[26px] sm:text-[34px] lg:text-[40px] font-semibold leading-[1.4] text-white">
              {t({ zh: '真正让世界变好的，', en: 'The world is changed' })}
              <br className="hidden sm:block" />
              {t({ zh: '是那些把想法落地的行动者。', en: 'by those who turn ideas into action.' })}
            </p>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-7 text-[15px] sm:text-[16px] leading-[1.85] text-white/65">
              {t({ zh: '益语智库愿做他们身后的底层能力：方法、工具、AI 工作流；', en: 'Yiyu Institute aims to be the capability behind them: methods, tools, and AI workflows.' })}
              <br className="hidden sm:block" />
              {t({ zh: '也邀请更多人，和我们一起，支持每一个正在行动的人。', en: 'And we invite more people to join us in backing everyone who is taking action.' })}
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
