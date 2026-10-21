import type { Language } from '../types';

// Simplified 3:2 flags; decorative, the button text names the language.
export function LanguageFlag({ language, size = 20 }: { readonly language: Language; readonly size?: number }) {
  const props = { width: size, height: (size * 2) / 3, viewBox: '0 0 30 20', 'aria-hidden': true as const, className: 'shrink-0 overflow-hidden rounded-[3px] ring-1 ring-white/15' };
  if (language === 'he') {
    return (
      <svg {...props}>
        <rect width="30" height="20" fill="#fff" />
        <rect y="2" width="30" height="3" fill="#0038b8" />
        <rect y="15" width="30" height="3" fill="#0038b8" />
        <path d="M15 6.2 18.3 11.9H11.7Z M15 13.8 11.7 8.1H18.3Z" fill="none" stroke="#0038b8" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#b22234" />
      ))}
      <rect width="13" height={(20 / 13) * 7} fill="#3c3b6e" />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <circle key={`${r}-${c}`} cx={2 + c * 3 + (r % 2) * 1.5} cy={2 + r * 3.6} r="0.55" fill="#fff" />))}
    </svg>
  );
}
