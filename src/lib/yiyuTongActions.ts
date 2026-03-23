import type { YiyuTongAction } from './yiyuTongApi';

const PREFILL_STORAGE_KEY = 'yiyu_tong_consult_prefill';

function isInternalTarget(target: string) {
  return target.startsWith('?') || target.startsWith('/') || target.startsWith(window.location.origin);
}

export function saveYiyuTongPrefill(payload?: Record<string, string>) {
  if (!payload) return;
  try {
    sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function getYiyuTongPrefill(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function runYiyuTongAction(action: YiyuTongAction) {
  if (action.prefillPayload) {
    saveYiyuTongPrefill(action.prefillPayload);
  }

  if (action.type === 'open_consult_form') {
    window.open(action.target, '_blank', 'noopener,noreferrer');
    return;
  }

  if (!isInternalTarget(action.target)) {
    window.location.assign(action.target);
    return;
  }

  const absoluteTarget = action.target.startsWith('http')
    ? new URL(action.target).pathname + new URL(action.target).search
    : action.target;

  const next = absoluteTarget.startsWith('?')
    ? `${window.location.pathname}${absoluteTarget}`
    : absoluteTarget;

  if (window.location.pathname + window.location.search !== next) {
    window.history.pushState({}, '', absoluteTarget);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}
