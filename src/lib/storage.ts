// Centralized helpers for persisting auth/session state.
//
// We support a "Remember me" mode:
// - remember=true  -> persist in localStorage
// - remember=false -> persist in sessionStorage (cleared when the browser/session closes)
//
// Reading always checks both, so users can still be recognized regardless of how they logged in.

export const USER_KEY = 'yiyu_current_user';
export const ADMIN_FLAG_KEY = 'yiyu_is_admin';
export const ADMIN_EMAIL_KEY = 'yiyu_admin_email';

export type StorageMode = 'local' | 'session';

export function getSavedItem(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export function setSavedItem(key: string, value: string, remember: boolean) {
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  primary.setItem(key, value);
  secondary.removeItem(key);
}

export function removeSavedItem(key: string) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function getSavedUserRaw(): string | null {
  return getSavedItem(USER_KEY);
}

export function saveUserRaw(raw: string, remember: boolean) {
  setSavedItem(USER_KEY, raw, remember);
}

export function clearUser() {
  removeSavedItem(USER_KEY);
  removeSavedItem(ADMIN_FLAG_KEY);
  removeSavedItem(ADMIN_EMAIL_KEY);
}
