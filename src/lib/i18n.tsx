import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// ============================================================
// 轻量双语 i18n (zh 默认 / en 叠加)
//   - 文案就地双语: t({ zh: '原文', en: '精翻' })
//   - zh 永远是原文 → 中文页面零影响
//   - en 缺省时自动回退 zh, 渐进式翻译不会报错/空白
//   - 语言选择持久化到 localStorage, 跨页面/刷新保持
// ============================================================

export type Lang = 'zh' | 'en';

export interface Bilingual {
  zh: string;
  en?: string;
}

const STORAGE_KEY = 'yiyu_lang';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  /** 取双语文本; en 缺省回退 zh */
  t: (text: Bilingual) => string;
  /** 仅当前是英文时返回 enClass, 否则空串 (用于英文版式微调) */
  enClass: (enClassName: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  t: (text) => text.zh,
  enClass: () => '',
});

function readInitialLang(): Lang {
  if (typeof window === 'undefined') return 'zh';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    /* ignore */
  }
  return 'zh';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, setLang]);

  // 初次挂载同步 <html lang>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    }
  }, [lang]);

  const t = useCallback(
    (text: Bilingual) => (lang === 'en' ? (text.en ?? text.zh) : text.zh),
    [lang],
  );

  const enClass = useCallback(
    (enClassName: string) => (lang === 'en' ? enClassName : ''),
    [lang],
  );

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, toggleLang, t, enClass }),
    [lang, setLang, toggleLang, t, enClass],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}

/** 便捷: 直接拿 t() */
export function useT() {
  return useContext(LangContext).t;
}
