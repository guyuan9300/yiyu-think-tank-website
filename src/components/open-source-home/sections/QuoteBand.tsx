import { Container, Reveal } from '../ui';

// 深蓝金句暗场带：打断淡色卡片节奏的"重音"，承接行动者启示的思想收束。
export function QuoteBand() {
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
              <span className="text-[12px] font-semibold tracking-[0.2em] text-os-violet/90">益语智库相信</span>
              <span className="h-px w-7 bg-os-violet/70" />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <p className="font-serif-display text-[26px] sm:text-[34px] lg:text-[40px] font-semibold leading-[1.4] text-white">
              所有伟大的事业，
              <br className="hidden sm:block" />
              都可以被拆解、组织、推进和迭代。
            </p>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-7 text-[15px] sm:text-[16px] leading-[1.85] text-white/65">
              我们把这些底层能力沉淀为方法、工具和 AI 工作流，帮助行动者把想法变为影响世界的现实。
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
