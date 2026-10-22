import type { ReactNode } from 'react';

export type IconName =
  | 'ball'
  | 'redCard'
  | 'yellowCard'
  | 'missedPenalty'
  | 'var'
  | 'woodwork'
  | 'substitution'
  | 'lineups'
  | 'kickoff'
  | 'fulltime'
  | 'tv'
  | 'list'
  | 'grid'
  | 'refresh'
  | 'close'
  | 'back'
  | 'star'
  | 'trophy'
  | 'live'
  | 'settings'
  | 'calendar'
  | 'stadium'
  | 'moon'
  | 'trendUp'
  | 'trendDown'
  | 'flame'
  | 'info'
  | 'wifiOff'
  | 'serverOff'
  | 'lock'
  | 'search'
  | 'check'
  | 'whistle';

// 24×24 grid, 1.75 stroke, currentColor — one vocabulary across the app.
const PATHS: Record<IconName, ReactNode> = {
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.5 4.3 3.1-1.6 5h-5.4l-1.6-5z" fill="currentColor" stroke="none" />
      <path d="M12 3v4.5M20.6 9.3l-4.3 1.3M17.3 19.3l-2.6-3.7M6.7 19.3l2.6-3.7M3.4 9.3l4.3 1.3" />
    </>
  ),
  redCard: <rect x="7" y="4" width="10" height="16" rx="2" fill="#ff3b3b" stroke="none" transform="rotate(8 12 12)" />,
  yellowCard: <rect x="7" y="4" width="10" height="16" rx="2" fill="var(--color-card-yellow)" stroke="none" transform="rotate(8 12 12)" />,
  missedPenalty: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  var: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="m8 9 1.5 4L11 9M13.5 13V9h2a1.2 1.2 0 0 1 0 2.4h-2" strokeWidth="1.5" />
    </>
  ),
  woodwork: (
    <>
      <path d="M3 20V5h18v15" strokeWidth="2.25" />
      <path d="M7 5v15M12 5v15M17 5v15M3 10h18M3 15h18" strokeWidth="1" opacity="0.45" />
    </>
  ),
  substitution: (
    <>
      <path d="M7 20V5m0 0L3.5 8.5M7 5l3.5 3.5" stroke="#00d26a" />
      <path d="M17 4v15m0 0 3.5-3.5M17 19l-3.5-3.5" stroke="#ff3b3b" />
    </>
  ),
  lineups: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  kickoff: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8.5 5 3.5-5 3.5z" fill="currentColor" />
    </>
  ),
  fulltime: <path d="M5 21V4m0 0h12l-2 4 2 4H5" />,
  tv: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="m8 2 4 4 4-4M8 21h8" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="m15 5-7 7 7 7" />,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3.5 3.5 0 0 0 3.7 4M16 6h3.5a3.5 3.5 0 0 1-3.7 4M12 13v4M8.5 20h7M10 17h4v3h-4z" />,
  live: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  trendUp: <path d="m4 16 6-6 4 4 6-6M15 8h5v5" />,
  trendDown: <path d="m4 8 6 6 4-4 6 6M15 16h5v-5" />,
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  stadium: (
    <>
      <ellipse cx="12" cy="9" rx="9" ry="3.5" />
      <path d="M3 9v6c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V9" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  flame: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.6-7.9.4 1.6 1.2 2.7 2.3 3.3.2-2.7 1.4-5.2 3.4-7.2.2 2.8 1.5 4.6 2.7 6.3 1.1 1.5 1.9 3.1 1.9 5.2 0 3.8-3.1 6.5-7.4 6.5zm0 0c-1.7 0-2.9-1.2-2.9-2.8 0-1.5 1.1-2.4 1.8-3.6.3.8.8 1.3 1.4 1.5.2-1 .7-1.9 1.4-2.6.3 1.2 1.2 2.1 1.2 3.5 0 2.4-1.5 4-2.9 4z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.75h.01" strokeWidth="2.25" />
    </>
  ),
  wifiOff: <path d="M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.5M14.8 10.4A10 10 0 0 1 19 12.9M2 9.4a15 15 0 0 1 4-2.6M10.5 5.6A15 15 0 0 1 22 9.4M12 20h.01" />,
  serverOff: (
    <>
      <rect x="3.5" y="4" width="17" height="6.5" rx="2" />
      <rect x="3.5" y="13.5" width="17" height="6.5" rx="2" />
      <path d="M7 7.25h.01M7 16.75h.01M11 16.75h6" strokeWidth="2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
    </>
  ),
  search: <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l4.5 4.5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  whistle: (
    <>
      <path d="M11 9h10v3.5l-6 1.5a5 5 0 1 1-4-5z" />
      <circle cx="9" cy="14" r="1.25" />
      <path d="M11 9V6h3" />
    </>
  ),
};

type Props = { readonly name: IconName; readonly size?: number; readonly className?: string; readonly title?: string };

export function Icon({ name, size = 16, className, title }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {PATHS[name]}
    </svg>
  );
}
