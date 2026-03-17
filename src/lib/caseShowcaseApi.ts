import { authRequest } from './authHttp';

export interface CaseShowcase {
  id: string;
  slug: string;
  clientName: string;
  industry: string;
  title: string;
  subtitle: string;
  tags: string[];
  logoUrl?: string;
  pptFileUrl?: string;
  pptFileName?: string;
  slideImages: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export function fetchCaseShowcases(scope: 'admin' | 'published' = 'published') {
  return authRequest<CaseShowcase[]>(`/case-showcases?scope=${scope}`, undefined, { withAuth: scope === 'admin' });
}

export function fetchCaseShowcaseDetail(slugOrId: string, scope: 'admin' | 'published' = 'published') {
  return authRequest<CaseShowcase>(`/case-showcases/${encodeURIComponent(slugOrId)}?scope=${scope}`, undefined, { withAuth: scope === 'admin' });
}

export function saveCaseShowcase(payload: Partial<CaseShowcase> & { clientName: string; title: string }) {
  return authRequest<CaseShowcase>(
    '/case-showcases/upsert',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { withAuth: true }
  );
}

export function deleteCaseShowcase(id: string) {
  return authRequest<null>(`/case-showcases/${encodeURIComponent(id)}`, { method: 'DELETE' }, { withAuth: true });
}
