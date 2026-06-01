// ============================================================
// 《创业者应该回答的 51 个问题》详情页内容
// 数据源:
//   - 顾源源提供的详情页策划文档 (hero / pain / structure / closing)
//   - 书 PDF 直接摘取 (pullQuote / tryOneQuestion / aboutBook)
// 组件只负责渲染, 改文案改这里就够。
// ============================================================

export interface PainQuestion {
  text: string;
}

export interface StructureBlock {
  code: 'A' | 'B' | 'C' | 'D';
  title: string;
  body: string;
  /** 该板块代表性问题 (从书 TOC 摘取, 4 个) */
  questions: string[];
}

export interface ProbabilityLevel {
  level: string;
  name: string;
  pct: string;
  desc: string;
}

export interface AboutBookFact {
  label: string;
  value: string;
}

export interface PagePreview {
  src: string;
  caption: string;
  alt: string;
}

export interface Book51DetailContent {
  pagePreviews: PagePreview[];
  hero: {
    eyebrow: string;
    subtitle: string; // 副书名
    titleTop: string;
    titleBottom: string;
    keywords: string[];
    positionLead: string;
    positionBody: string;
  };
  pain: {
    titleTop: string;
    titleBottom: string;
    questions: PainQuestion[];
    closing: string;
  };
  pullQuote: {
    /** 书内开篇金句 */
    quote: string;
    source: string;
  };
  tryOneQuestion: {
    questionNumber: string;
    questionTitle: string;
    intro: string;
    frameworkTitle: string;
    frameworkSubtitle: string;
    levels: ProbabilityLevel[];
    closing: string;
  };
  structure: {
    title: string;
    body: string;
    blocks: StructureBlock[];
    closing: string;
  };
  aboutBook: {
    title: string;
    body: string;
    publishers: string[];
    facts: AboutBookFact[];
  };
  closing: {
    titleTop: string;
    titleBottom: string;
    body: string;
    reasons: string[];
    finalQuote: string;
  };
}

export const BOOK_51_CONTENT: Book51DetailContent = {
  // 翻书预览：直接展示书的真实页面（原书页图），不做二次创作
  pagePreviews: [
    { src: '/images/book-51-pages/preview-1-title.png', caption: '书名页', alt: '《创业者应该回答的51个问题》书名页' },
    { src: '/images/book-51-pages/preview-2-preface.png', caption: '序言', alt: '本书序言' },
    { src: '/images/book-51-pages/preview-3-toc-ab.png', caption: '目录 · 看机会 / 找对人', alt: '目录：A 看机会、B 找对人' },
    { src: '/images/book-51-pages/preview-4-toc-cd.png', caption: '目录 · 通模式 / 能增长', alt: '目录：C 通模式、D 能增长' },
  ],
  hero: {
    eyebrow: '创业者应该回答的 51 个问题',
    subtitle: '创业者赋能手册',
    titleTop: '创业不是先找答案，',
    titleBottom: '而是先知道哪些问题必须被回答。',
    keywords: ['看机会', '找对人', '通模式', '能增长'],
    positionLead: '这不是一本创业鸡血书。',
    positionBody:
      '它更像一份创业前、中、后的自测清单，帮你判断：这件事值不值得做，应该和谁做，模式能不能跑通，增长能不能持续。',
  },

  pain: {
    titleTop: '很多创业，不是败在不努力，',
    titleBottom: '而是关键问题一开始就没想清楚。',
    questions: [
      { text: '需求是真的吗？' },
      { text: '用户为什么需要你？' },
      { text: '团队对吗？' },
      { text: '模式跑得通吗？' },
      { text: '增长从哪里来？' },
      { text: '卡点在哪里？' },
    ],
    closing: '如果问题没问对，努力可能只是在错误方向上加速。',
  },

  // 来自书第一章「看机会」的开篇金句
  pullQuote: {
    quote:
      '创业不是靠蛮干，选择比努力更重要。一个聪明的创业者，应该像一个精准的射手，不是每一支箭都瞄准远方，而是找到那个能一箭中的的靶心。',
    source: '——节选自书内第一章 · 看机会',
  },

  // 试读一道：Q01 + 书中真实的 8 层成功概率分层表
  // 数据按原书 (页 6) 完整复现, 文字描述做了适度收敛
  tryOneQuestion: {
    questionNumber: '01',
    questionTitle: '你觉得创业成功的概率有多大？',
    intro:
      '每个人对"创业成功"的定义都不同——有人觉得做到上市才算赢，有人觉得被大厂收购就够了。但绝大多数创业者在刚起步时都会高估自己的概率。先认清现实，了解创业各阶段的成功概率，才是稳健第一步。',
    frameworkTitle: '创业成功概率分层表',
    frameworkSubtitle: '从第 0 层到第 7 层 · 概率随阶段层层收窄',
    levels: [
      { level: '第 0 层', name: '失败', pct: '86%', desc: '三年内关闭或未能达到预期目标' },
      { level: '第 1 层', name: '维持生存', pct: '10%', desc: '勉强运营，没高利润但没关闭' },
      { level: '第 2 层', name: '稳定运营', pct: '4%', desc: '稳定客户群 · 正向现金流 · 增长缓慢' },
      { level: '第 3 层', name: '行业小有名气', pct: '2%', desc: '小有名气，吸引中型投资或被收购' },
      { level: '第 4 层', name: '战略性收购', pct: '0.75%', desc: '被更大公司以可观估值收购' },
      { level: '第 5 层', name: '独角兽阶段', pct: '0.3%', desc: '估值达 10 亿美元，未上市，高速增长' },
      { level: '第 6 层', name: 'IPO', pct: '0.05%', desc: '成功上市，公众公司，高度市场认可' },
      { level: '第 7 层', name: '市场领导者', pct: '0.01%', desc: '行业领导或接近垄断，全球知名度' },
    ],
    closing: '答完这一题，你已经在用「创业者赋能手册」的方法做判断。后面还有 50 题。',
  },

  // 结构总览 + 每个板块下的 4 个代表性问题 (来自书 TOC)
  structure: {
    title: '51 个问题，4 条创业主线。',
    body: '从想法到事业，不是一步跳过去，而是一步步问清楚。',
    blocks: [
      {
        code: 'A',
        title: '看机会',
        body: '判断这件事值不值得做。',
        questions: [
          '你觉得创业成功的概率有多大？',
          '你的细分定位是什么？',
          '这个需求是真的吗？',
          '你的产品内核是什么？',
        ],
      },
      {
        code: 'B',
        title: '找对人',
        body: '判断你该和谁一起做。',
        questions: [
          '你是哪种创业者？',
          '你有战略思维吗？',
          '你的团队平衡吗？',
          '你的二把手是什么样的人？',
        ],
      },
      {
        code: 'C',
        title: '通模式',
        body: '判断业务能不能跑起来。',
        questions: [
          '你的品牌是不是清晰的？',
          'MVP 怎么做？',
          '如何低成本启动？',
          '有没有业务测算模型？',
        ],
      },
      {
        code: 'D',
        title: '能增长',
        body: '判断事业能不能持续变大。',
        questions: [
          '你有增长飞轮吗？',
          '你的壁垒是什么？',
          '你怎么开展销售？',
          '市场规模有多大？',
        ],
      },
    ],
    closing: '4 个板块 × 16 个代表问题, 完整版共 51 题。',
  },

  // 关于本书 · 只写可核实的事实, 不编凭据
  aboutBook: {
    title: '这本书由谁写、和谁一起做',
    body:
      '这是益语智库与 ETHOS CAPITAL 联合出品的《创业者赋能手册》，写给所有正在认真把想法变成事业的人。书的内核是一组创业者必须回答的问题——不是套路、不是清单，而是一种"先问对，再答对"的判断方法。',
    publishers: ['益语智库 出品', 'ETHOS CAPITAL 联合出品'],
    facts: [
      { label: '副书名', value: '创业者赋能手册' },
      { label: '体例', value: '问答 · 工具书 · 自测手册' },
      { label: '篇幅', value: '4 大板块 / 51 个核心问题 / 118 页' },
      { label: '阅读方式', value: '一次读完 · 也可反复翻、按板块查' },
    ],
  },

  closing: {
    titleTop: '真正能走远的事业，',
    titleBottom: '从一组诚实的问题开始。',
    body: '你不需要一开始就有完整答案。但你需要知道，哪些问题必须被回答。',
    reasons: [
      '51 个创业关键问题',
      '4 条判断主线 · 16 个代表问题已在上文给你看过',
      '适合反复翻、反复写、反复对照',
      '可作为创业自测、团队共读、项目复盘工具',
    ],
    finalQuote: '先看机会，再找对人；先通模式，再谈增长。',
  },
};
