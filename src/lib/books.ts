// ============================================================
// 书籍数据 (首页书架 + 书籍详情页 共用单一来源)
// 三档销售, 定价均含益语智库一年会员; 两本合购再省 50。
// 购买后授予一年会员 (后端套餐待接: book_51 / book_org / book_bundle)。
// ============================================================

export type BookPlanId = 'book_51' | 'book_org' | 'book_bundle';

export interface BookItem {
  planId: BookPlanId;
  cover: string;
  title: string;
  enTitle: string;
  priceYuan: number;
  tagline: string;
  intro: string;
  /** 卖点 / 核心收获 */
  points: string[];
  /** 详情页目录 / 章节结构 */
  outline?: string[];
}

export const BOOK_51: BookItem = {
  planId: 'book_51',
  cover: '/images/books/book-51-questions-cover.png',
  title: '创业者应该回答的51个问题',
  enTitle: 'THE 51 QUESTIONS THAT ENTREPRENEURS SHOULD ANSWER',
  priceYuan: 198,
  tagline: '看机会 · 找对人 · 通模式 · 能增长',
  intro:
    '把创业路上必须想清楚的 51 个关键问题，按「看机会、找对人、通模式、能增长」四个阶段系统梳理。不是灵感清单，而是一套可复制、可积累的底层判断框架——帮你在每个关键决策点，问对问题、答对方向。',
  points: [
    '51 个必答问题，覆盖从 0 到 1 的全流程',
    '四大能力模块：看机会 / 找对人 / 通模式 / 能增长',
    '边读边答，沉淀属于你自己的创业答卷',
    '附赠益语智库一年会员，畅读全部文章与报告',
  ],
  outline: [
    '看机会：预判成败 · 行业理解 · 需求验证 · 产品设计',
    '找对人：战略优先 · 系统思考 · 社会责任 · 组织平衡',
    '通模式：品牌营销 · 业务设计 · 业务测算',
    '能增长：持续增长 · 销售扩张 · 资本运作',
  ],
};

export const BOOK_ORG: BookItem = {
  planId: 'book_org',
  cover: '/images/books/book-learning-org.png',
  title: '学习型组织笔记',
  enTitle: 'NOTES ON LEARNING ORGANIZATIONS',
  priceYuan: 138,
  tagline: '让组织持续学习 · 让战略自驱生长',
  intro:
    '一本写给管理者的学习型组织实践笔记。从改变心智模式、建立共同愿景，到系统思考与自我超越——让组织真正具备持续进化的能力，让战略不靠人推、而是自驱生长。',
  points: [
    '改变心智模式，培养创新文化',
    '共同愿景：团队力量的来源',
    '系统思考，避免短视行为',
    '附赠益语智库一年会员，畅读全部文章与报告',
  ],
  outline: [
    '是什么阻止了你的成功',
    '改变心智模式，培养创新文化',
    '共同愿景——团队力量的来源',
    '采用系统思考，避免短视行为',
    '自我超越是这个时代最重要的精神',
  ],
};

export const BOOKS: BookItem[] = [BOOK_51, BOOK_ORG];

export const BUNDLE_PRICE = BOOK_51.priceYuan + BOOK_ORG.priceYuan - 50; // 286

/** 按 planId 取书 (bundle 返回 null, 由详情页特殊处理) */
export function getBookByPlanId(planId: string): BookItem | null {
  return BOOKS.find((b) => b.planId === planId) || null;
}

export const LIFETIME_TAGLINE = '所有收入用于为行动者加电';
