import { useLang } from './i18n.tsx';

// Unstyled on purpose: each concept styles `.lang-toggle` in its own vocabulary.
export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-toggle ${className}`.trim()} role="group" aria-label={lang === 'he' ? 'שפה' : 'Language'}>
      <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
        EN
      </button>
      <button type="button" lang="he" aria-pressed={lang === 'he'} onClick={() => setLang('he')}>
        עב
      </button>
    </div>
  );
}
