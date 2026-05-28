import { ArrowRight, Github, Map, Users } from 'lucide-react';
import { Container, Reveal } from '../ui';
import { ANCHORS, GITHUB_URL } from '../links';

export function FinalCta() {
  return (
    <section id="download" className="scroll-mt-24 relative overflow-hidden bg-os-navy py-20 sm:py-24 lg:py-28">
      {/* 局部深色强调，极淡光晕，非霓虹 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[60%] h-[80%] rounded-full bg-os-blue/20 blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[8%] w-[36%] h-[70%] rounded-full bg-os-spark/10 blur-[120px]" />
      </div>

      <Container className="relative">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <h2 className="font-serif-display text-[30px] sm:text-[40px] font-semibold leading-[1.25] text-white">
              从自己的第一个行动开始
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-5 text-[15px] sm:text-[16px] leading-[1.85] text-white/70">
              下载益语智库开源版，先让 AI 学会理解你的项目。如果你是开发者、支持者或资源伙伴，也欢迎加入共建，让更多行动者拥有自己的 AI 后台能力。
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={ANCHORS.download}
                className="group inline-flex items-center gap-2 rounded-full bg-os-spark text-white px-7 py-3.5 min-h-[44px] text-[15px] font-semibold shadow-os hover:brightness-[1.05] transition-all active:scale-[0.98]"
              >
                下载开源版
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white px-6 py-3.5 min-h-[44px] text-[15px] font-semibold ring-1 ring-white/20 hover:bg-white/15 transition-all active:scale-[0.98]"
              >
                <Github className="w-4 h-4" />
                查看 GitHub
              </a>
              <a
                href={ANCHORS.roadmap}
                className="inline-flex items-center gap-2 rounded-full bg-transparent text-white/85 px-6 py-3.5 min-h-[44px] text-[15px] font-semibold ring-1 ring-white/20 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <Map className="w-4 h-4" />
                查看 Roadmap
              </a>
              <a
                href={ANCHORS.join}
                className="inline-flex items-center gap-2 rounded-full bg-transparent text-white/85 px-6 py-3.5 min-h-[44px] text-[15px] font-semibold ring-1 ring-white/20 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <Users className="w-4 h-4" />
                加入社群
              </a>
            </div>
          </Reveal>
          <Reveal delay={260}>
            <p className="mt-6 text-[13px] text-white/45">
              开源版下载正在内测准备中，当前可先前往 GitHub 查看源码与构建方式。
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
