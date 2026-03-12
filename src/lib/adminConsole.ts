export const ADMIN_VISIBLE_TABS = [
  'dashboard',
  'insights',
  'reports',
  'books',
  'methodologies',
  'comments',
  'strategy-companion',
  'user-management',
  'membership',
  'invite-codes',
] as const;

export type AdminTab = (typeof ADMIN_VISIBLE_TABS)[number];

export const LEGACY_ADMIN_TAB_MAP: Record<string, AdminTab> = {
  insights: 'insights',
  reports: 'reports',
  books: 'books',
  methodologies: 'methodologies',
  'user-management': 'user-management',
  membership: 'membership',
  'invite-codes': 'invite-codes',
  'strategy-companion': 'strategy-companion',
  comments: 'comments',
};

const ADMIN_TAB_SET = new Set<string>(ADMIN_VISIBLE_TABS);

export function normalizeAdminTab(raw: string | null | undefined): AdminTab {
  return raw && ADMIN_TAB_SET.has(raw) ? (raw as AdminTab) : 'dashboard';
}

export function getAdminTabFromSearchParams(params: URLSearchParams): AdminTab {
  const tab = params.get('tab');
  if (tab) {
    return normalizeAdminTab(tab);
  }

  const legacyTab = params.get('legacyTab');
  if (legacyTab) {
    return LEGACY_ADMIN_TAB_MAP[legacyTab] || 'dashboard';
  }

  return 'dashboard';
}

export function buildAdminUrl(tab: AdminTab = 'dashboard'): string {
  const params = new URLSearchParams();
  params.set('page', 'admin');
  if (tab !== 'dashboard') {
    params.set('tab', tab);
  }
  return `?${params.toString()}`;
}
