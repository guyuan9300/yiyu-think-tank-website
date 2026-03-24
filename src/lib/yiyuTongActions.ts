import type { YiyuTongAction } from './yiyuTongApi';

function isInternalTarget(target: string) {
  return target.startsWith('?') || target.startsWith('/') || target.startsWith(window.location.origin);
}

export function runYiyuTongAction(action: YiyuTongAction) {
  if (!isInternalTarget(action.target)) {
    if (action.type === 'open_consult_form') {
      window.open(action.target, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.assign(action.target);
    return;
  }

  const absoluteTarget = action.target.startsWith('http')
    ? new URL(action.target).pathname + new URL(action.target).search
    : action.target;

  const next = absoluteTarget.startsWith('?')
    ? `${window.location.pathname}${absoluteTarget}`
    : absoluteTarget;

  if (window.__YIYU_TONG_APP__?.openInternalUrl) {
    window.__YIYU_TONG_APP__.openInternalUrl(next);
    return;
  }

  if (window.location.pathname + window.location.search !== next) {
    window.history.pushState({}, '', absoluteTarget);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}
