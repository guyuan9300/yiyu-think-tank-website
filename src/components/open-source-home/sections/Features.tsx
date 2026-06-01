import { useState } from 'react';
import {
  Layers, MessageSquare, User, Clock, Network, Bot,
  Shield, Heart, Download, Target, Users, ArrowRight, ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { Container, Section, Reveal } from '../ui';
import { FUTURE_ROUTES } from '../links';
import { FactClarifyLightbox } from './FactClarifyDemo';
import { SmartEditLightbox } from './SmartEditDemo';
import { useLang, type Bilingual } from '../../../lib/i18n';

interface FeatureEntry {
  num: string;
  icon: LucideIcon;
  title: Bilingual;
  body: Bilingual[];
  takeIcon: LucideIcon;
  take: Bilingual;
  /** 卡片点击落点。未来分页面建好后可替换为对应二级页；现在统一指向 #features 锚点（保持非死链） */
  href: string;
  /** 可选：点击卡片时打开一个悬浮 lightbox（替代默认的 anchor 跳转） */
  lightbox?: 'fact-clarify' | 'smart-edit';
}

const FEATURES: FeatureEntry[] = [
  {
    num: '01',
    icon: Layers,
    title: { zh: 'AI 会分清：\n哪些已经确认，哪些只是线索，\n哪些必须等你来定。', en: 'AI tells apart\nwhat is confirmed, what is just a lead,\nand what must wait for your call.' },
    body: [
      { zh: '普通 AI 最大的风险，不是答不出来，而是把不确定的内容说得很肯定。', en: 'The biggest risk with ordinary AI is not failing to answer — it is stating uncertain things with total confidence.' },
      { zh: '益语智库会把信息按可信程度放好：可以先记下线索，但不会把未经确认的内容当成权威依据；遇到拿不准的地方，它会明确提出来，让你确认之后再进入正式判断。', en: 'Yiyu Institute files information by how trustworthy it is: leads can be noted, but unconfirmed content is never treated as authoritative. When unsure, it says so clearly and waits for your confirmation before it informs any real decision.' },
    ],
    takeIcon: Shield,
    take: { zh: '让 AI 更可信，而不是更会编。', en: 'Make AI more trustworthy, not more inventive.' },
    href: FUTURE_ROUTES.features,
    lightbox: 'fact-clarify',
  },
  {
    num: '02',
    icon: MessageSquare,
    title: { zh: '每一次提问和生成，\n都能接上这个项目的历史。', en: 'Every question and every draft\nbuilds on this project’s history.' },
    body: [
      { zh: '每个客户或项目都有独立工作台。聊天、文件、战略、合同、提案、复盘和待澄清事项，都围绕同一个对象沉淀。', en: 'Every client or project has its own workspace. Chats, files, strategy, contracts, proposals, reviews, and open questions all accumulate around the same object.' },
      { zh: '你可以让 AI 生成整段内容，也可以只改一句话、一个词，或翻译一个句子。', en: 'You can have AI generate whole passages, or just rewrite a single sentence, tweak a word, or translate one line.' },
      { zh: '它不是从空白开始，而是在这个项目的历史里帮你调整表达。', en: 'It does not start from a blank page — it works within this project’s history to refine how you say things.' },
    ],
    takeIcon: User,
    take: { zh: '让背景不再反复丢失。', en: 'Stop losing the context, again and again.' },
    href: FUTURE_ROUTES.features,
    lightbox: 'smart-edit',
  },
  {
    num: '03',
    icon: User,
    title: { zh: '像一位资深战略顾问，\n陪你看清每个重要项目。', en: 'Like a seasoned strategy advisor,\nhelping you see each project clearly.' },
    body: [
      { zh: '益语智库不只是帮你写材料，而是持续陪你理解每一个重要项目：它在做什么，真正价值是什么，正在和谁合作，当前卡在哪里，下一步重点要推进什么。', en: 'Yiyu Institute does more than draft documents — it helps you keep understanding each key project: what it is doing, its real value, who it works with, where it is stuck, and what to push next.' },
      { zh: '它让项目不只是散落的会议、文件和报告，而是一条可以持续理解、持续更新的合作脉络。', en: 'It turns a project from scattered meetings, files, and reports into a living thread you can keep understanding and updating.' },
    ],
    takeIcon: Heart,
    take: { zh: '让项目陪伴不再断线。', en: 'Keep project context from breaking.' },
    href: FUTURE_ROUTES.features,
  },
  {
    num: '04',
    icon: Clock,
    title: { zh: '多年项目不再散落，\n所有动作和文件都能串成一条线。', en: 'Multi-year projects stay together,\nevery action and file on one timeline.' },
    body: [
      { zh: '一个项目做三年、五年、十年，最怕材料散在人、群、网盘和旧文档里。', en: 'When a project runs three, five, or ten years, the worst fate is materials scattered across people, chats, drives, and old documents.' },
      { zh: '益语智库会把合同、会议、提案、任务、沟通和关键文件按时间线串起来。写合同、提案、汇报时，系统可以回到项目历史里找背景；文件也能随时查看和下载，不再只靠人脑记住。', en: 'Yiyu Institute threads contracts, meetings, proposals, tasks, communications, and key files onto one timeline. When you write a contract, proposal, or report, the system can reach back into the project’s history for context, and files stay viewable and downloadable — no longer kept only in someone’s head.' },
    ],
    takeIcon: Download,
    take: { zh: '让长期项目有迹可循。', en: 'Make long-running projects traceable.' },
    href: FUTURE_ROUTES.features,
  },
  {
    num: '05',
    icon: Network,
    title: { zh: '把战略拆到能执行，\n把任务分给人和 AI 同事。', en: 'Break strategy down to execution,\nand assign tasks to people and AI teammates.' },
    body: [
      { zh: '行动者经常被日常事务埋住，只知道很忙，却很难抬起头看清方向。', en: 'Actioners are often buried in day-to-day work — busy without ever looking up to see the direction.' },
      { zh: '战略拆解不是写一份宏大的规划，而是把战略变成目标，把目标变成任务，再分配给同事和机器人同事一起推进。', en: 'Decomposing strategy is not writing a grand plan. It is turning strategy into goals, goals into tasks, then assigning them to teammates and AI teammates to move forward together.' },
      { zh: '脚踏实地重要，抬头看路更重要。', en: 'Keeping your feet on the ground matters; looking up at the road matters more.' },
    ],
    takeIcon: Target,
    take: { zh: '让方向变成今天能推进的行动。', en: 'Turn direction into action you can take today.' },
    href: FUTURE_ROUTES.features,
  },
  {
    num: '06',
    icon: Bot,
    title: { zh: '给 AI 一个办公室，\n它才像同事一样把事做好。', en: 'Give AI an office,\nand it works like a real teammate.' },
    body: [
      { zh: '你可以一次性把一天要做的事情交代给机器人同事。它不是在聊天框里凭空猜答案，而是在益语智库这个工作环境里，沿着项目线索、文件、任务和历史背景去推进工作。', en: 'You can hand an AI teammate a whole day of work at once. It does not guess answers in a chat box — it works inside the Yiyu Institute environment, following project leads, files, tasks, and history.' },
      { zh: '益语智库给 AI 同事准备了资料、任务、权限和过程记录，让它能真正进入组织协作。', en: 'Yiyu Institute gives AI teammates the materials, tasks, permissions, and audit trail they need to truly take part in how the organization works together.' },
    ],
    takeIcon: Users,
    take: { zh: '让 AI 从工具变成可协作的同事。', en: 'Turn AI from a tool into a collaborating teammate.' },
    href: FUTURE_ROUTES.features,
  },
];

export function Features() {
  const { t } = useLang();
  const [openLightbox, setOpenLightbox] = useState<FeatureEntry['lightbox'] | null>(null);

  return (
    <Section id="features" tone="lavender">
      <Container>
        {/* 标题区 */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="h-px w-7 bg-os-indigo/50" />
              <span className="text-[12px] font-semibold tracking-[0.18em] text-os-indigo">{t({ zh: '功能模块', en: 'Features' })}</span>
              <span className="h-px w-7 bg-os-indigo/50" />
            </div>
            <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[42px] font-semibold tracking-tight text-os-navy">
              {t({ zh: '益语智库的 AI 的核心能力', en: 'The core capabilities of Yiyu AI' })}
            </h2>
            <p className="mt-6 text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
              {t({ zh: '益语智库不是把 AI 功能堆在一起，而是让 AI 真正进入组织工作的关键环节：知道什么可信，记得项目历史，看清合作脉络，串起长期时间线，拆出可执行任务，并以同事身份参与推进。', en: 'Yiyu Institute does not pile up AI features. It brings AI into the moments that matter in real work: knowing what is trustworthy, remembering project history, seeing the thread of collaboration, connecting the long timeline, breaking out executable tasks, and joining in as a teammate.' })}
            </p>
          </div>
        </Reveal>

        {/* 6 张能力卡 —— 可点击，三层 affordance 信号叠加：
              Layer 1 持久信号：右上角 ↗ 锚点（一直可见，低饱和度）
              Layer 2 悬浮反馈：卡片上抬 + 阴影变厚 + 边框紫色加深 + ↗ 挪一下 + "01" / take 标语色变深
              Layer 3 可选加料：focus-visible 焦点环 + 极淡紫色 gradient overlay
        */}
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const TakeIcon = f.takeIcon;
            return (
              <Reveal key={f.num} delay={(i % 3) * 90 + Math.floor(i / 3) * 120} className="h-full">
                <a
                  href={f.href}
                  aria-label={`${t({ zh: '了解能力', en: 'Learn about capability' })} ${f.num}: ${t(f.title).replace(/\n/g, ' ')}`}
                  onClick={
                    f.lightbox
                      ? (e) => {
                          e.preventDefault();
                          setOpenLightbox(f.lightbox ?? null);
                        }
                      : undefined
                  }
                  className="feature-motion-card group relative block h-full p-7 rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-os-lg hover:ring-os-violet/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-blue/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F3FC]"
                >
                  {/* Layer 3a: 悬浮时的极淡紫色 gradient overlay（克制） */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0) 55%)',
                    }}
                  />

                  {/* Layer 1: 右上角持久 ↗ 锚点 */}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="feature-motion-arrow absolute top-6 right-6 w-[18px] h-[18px] text-os-indigo/35 transition-all duration-300 group-hover:text-os-violet group-hover:-translate-y-[2px] group-hover:translate-x-[2px]"
                    strokeWidth={2}
                  />

                  {/* 主要内容 */}
                  <div className="relative flex flex-col h-full">
                    <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-5 items-start">
                      <span className="feature-motion-number font-serif-display text-[30px] font-bold leading-none text-os-indigo transition-colors duration-300 group-hover:text-os-violet">
                        {f.num}
                      </span>
                      {/* 标题右侧留空给 ↗ 锚点（pr-9）防止文字撞上图标 */}
                      <h3 className="font-serif-display text-[16.5px] sm:text-[18px] font-semibold leading-[1.5] text-os-navy whitespace-pre-line pr-9">
                        {t(f.title)}
                      </h3>
                      <Icon className="feature-motion-icon w-8 h-8 text-os-indigo mt-1" strokeWidth={1.6} />
                      <div className="space-y-2.5">
                        {f.body.map((para, idx) => (
                          <p key={idx} className="text-[13.5px] leading-[1.9] text-os-muted">{t(para)}</p>
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto pt-6 flex items-center gap-2 text-[13.5px] font-medium text-os-indigo transition-colors duration-300 group-hover:text-os-violet">
                      <TakeIcon className="feature-motion-take-icon w-4 h-4 shrink-0 transition-colors duration-300" strokeWidth={1.8} />
                      {t(f.take)}
                    </div>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>

        {/* 底部 CTA */}
        <div className="mt-14 text-center">
          <a
            href={FUTURE_ROUTES.features}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-os-navy to-os-indigo text-white px-7 py-3.5 min-h-[48px] text-[15px] font-semibold shadow-os hover:brightness-110 transition-all"
          >
            {t({ zh: '查看全部功能模块', en: 'View All Features' })}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <p className="mt-4 text-[14px] text-os-muted">{t({ zh: '了解益语智库如何帮你落地这些能力', en: 'See how Yiyu Institute helps you put these capabilities to work' })}</p>
        </div>
      </Container>

      {/* 事实澄清演示悬浮窗 —— 点 Card #01 触发 */}
      <FactClarifyLightbox
        open={openLightbox === 'fact-clarify'}
        onClose={() => setOpenLightbox(null)}
      />

      {/* 智能编辑演示悬浮窗 —— 点 Card #02 触发 */}
      <SmartEditLightbox
        open={openLightbox === 'smart-edit'}
        onClose={() => setOpenLightbox(null)}
      />
    </Section>
  );
}
