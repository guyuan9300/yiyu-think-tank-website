import siteMapJson from '../config/yiyuTongSiteMap.json';

type SiteMapSection = {
  id: string;
  title: string;
  type: string;
  order: number;
  enterable: boolean;
  tour: boolean;
};

type SiteMapAnswerContext = {
  contact?: {
    sectionId?: string;
    phone?: string;
    email?: string;
    wechatOfficial?: string;
  };
  plans?: Array<{
    id: string;
    name: string;
    price: string;
    durationDays: number;
    highlight?: string;
    description?: string;
  }>;
  rights?: string[];
};

type SiteMapPage = {
  id: string;
  label: string;
  url?: string;
  urlPattern?: string;
  level: 'primary' | 'secondary' | 'detail' | 'utility';
  group: string;
  parentId?: string;
  publicTour: boolean;
  tourRepresentativeDetail?: boolean;
  representativeChildren?: string[];
  representativeDetail?: {
    pageId: string;
    selection: 'latest_published';
  };
  answerContext?: SiteMapAnswerContext;
  sections: SiteMapSection[];
};

type SiteMap = {
  version: string;
  tour: {
    publicOrder: string[];
    finalPageId: string;
  };
  sharedSections?: SiteMapSection[];
  rules: Record<string, unknown>;
  completionRules: Record<string, unknown>;
  pages: Record<string, SiteMapPage>;
};

export const YIYU_TONG_SITE_MAP = siteMapJson as SiteMap;

export function getYiyuPageConfig(pageId: string) {
  return YIYU_TONG_SITE_MAP.pages[pageId];
}

export function getYiyuSectionConfig(pageId: string, sectionId: string) {
  return YIYU_TONG_SITE_MAP.pages[pageId]?.sections.find((section) => section.id === sectionId);
}

export function getYiyuPageAttrs(pageId: string) {
  const page = getYiyuPageConfig(pageId);
  if (!page) {
    return {
      'data-yiyu-page': pageId,
    } as const;
  }
  return {
    'data-yiyu-page': page.id,
    'data-yiyu-page-level': page.level,
    'data-yiyu-page-group': page.group,
  } as const;
}

export function getYiyuSectionAttrs(pageId: string, sectionId: string) {
  const section = getYiyuSectionConfig(pageId, sectionId);
  if (!section) {
    return {
      'data-yiyu-section': sectionId,
    } as const;
  }
  return {
    'data-yiyu-section': section.id,
    'data-yiyu-section-type': section.type,
    'data-yiyu-section-title': section.title,
    'data-yiyu-section-order': String(section.order),
    'data-yiyu-section-enterable': section.enterable ? 'true' : 'false',
  } as const;
}

export function getYiyuTourOrder() {
  return [...YIYU_TONG_SITE_MAP.tour.publicOrder];
}

export function getYiyuPageAnswerContext(pageId: string) {
  return getYiyuPageConfig(pageId)?.answerContext;
}

export function getYiyuSharedSections() {
  return Array.isArray(YIYU_TONG_SITE_MAP.sharedSections) ? YIYU_TONG_SITE_MAP.sharedSections : [];
}

export function getYiyuPageUrl(pageId: string) {
  return getYiyuPageConfig(pageId)?.url || '';
}

export function listYiyuPagesByLevel(level: SiteMapPage['level']) {
  return Object.values(YIYU_TONG_SITE_MAP.pages).filter((page) => page.level === level);
}
