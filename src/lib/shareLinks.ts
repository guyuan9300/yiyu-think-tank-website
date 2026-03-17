export type ShareContentType = 'article' | 'report' | 'book' | 'methodology';

function getBaseRoot() {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base === '/' ? '' : base.replace(/\/$/, '');
  return `${window.location.origin}${normalizedBase}`;
}

export function buildContentDetailUrl(contentType: ShareContentType, id: string) {
  const base = getBaseRoot();
  if (contentType === 'article') {
    return `${base}/?page=article&id=${encodeURIComponent(id)}`;
  }
  if (contentType === 'report') {
    return `${base}/?page=report&id=${encodeURIComponent(id)}`;
  }
  if (contentType === 'book') {
    return `${base}/?page=book-reader&id=${encodeURIComponent(id)}`;
  }
  return `${base}/?page=methodology-library&id=${encodeURIComponent(id)}`;
}

export function buildShareLandingUrl(contentType: ShareContentType, id: string, slugOrId?: string) {
  const base = getBaseRoot();
  return `${base}/share/${contentType}/${encodeURIComponent(slugOrId || id)}/`;
}
