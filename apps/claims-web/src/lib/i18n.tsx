import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'he';
export type Bi = { readonly en: string; readonly he: string };

type LangContextValue = {
  readonly lang: Lang;
  readonly dir: 'ltr' | 'rtl';
  readonly setLang: (lang: Lang) => void;
  readonly toggle: () => void;
  readonly t: (text: Bi) => string;
};

const STORAGE_KEY = 'claims-web:lang';
const LangContext = createContext<LangContextValue | null>(null);

function readInitialLang(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'he' || fromUrl === 'en') return fromUrl;
  return window.localStorage.getItem(STORAGE_KEY) === 'he' ? 'he' : 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(() => setLangState((l) => (l === 'en' ? 'he' : 'en')), []);
  const t = useCallback((text: Bi) => text[lang], [lang]);
  const value = useMemo(() => ({ lang, dir, setLang, toggle, t }), [lang, dir, setLang, toggle, t]) as LangContextValue;

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}

export function bi(en: string, he: string): Bi {
  return { en, he };
}
