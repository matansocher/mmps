import type { CategoryId } from '../lib/types';

/**
 * Original, hand-built SVG illustrations for each game.
 *
 * Every piece is drawn on a 64x64 canvas with two theme colors:
 *   - `tint`  : a soft, light fill for background shapes
 *   - `accent`: the category's solid accent for the focal shapes
 *
 * Art is intentionally simple, rounded and playful so it reads well from the
 * tiny home cards up to the large intro hero. Colors are passed in by the
 * caller so a game always matches its category palette (and dark mode).
 */

interface ArtProps {
  tint: string;
  accent: string;
}

type Art = (p: ArtProps) => React.ReactElement;

const gridRecall: Art = ({ tint, accent }) => (
  <>
    {[12, 30, 48].map((x) =>
      [12, 30, 48].map((y) => (
        <rect key={`${x}-${y}`} x={x - 6} y={y - 6} width="12" height="12" rx="3.5" fill={tint} />
      )),
    )}
    <rect x="6" y="24" width="12" height="12" rx="3.5" fill={accent} />
    <rect x="24" y="42" width="12" height="12" rx="3.5" fill={accent} />
    <rect x="42" y="6" width="12" height="12" rx="3.5" fill={accent} />
    <rect x="42" y="42" width="12" height="12" rx="3.5" fill={accent} />
  </>
);

const pairMatch: Art = ({ tint, accent }) => (
  <>
    <rect x="8" y="14" width="20" height="30" rx="5" fill={tint} transform="rotate(-8 18 29)" />
    <rect x="36" y="20" width="20" height="30" rx="5" fill={accent} transform="rotate(8 46 35)" />
    <circle cx="18" cy="27" r="5" fill={accent} transform="rotate(-8 18 29)" />
    <circle cx="46" cy="33" r="5" fill="#fff" opacity="0.85" transform="rotate(8 46 35)" />
  </>
);

const sequenceEcho: Art = ({ tint, accent }) => (
  <>
    <circle cx="22" cy="22" r="11" fill={tint} />
    <circle cx="44" cy="24" r="9" fill={tint} />
    <circle cx="26" cy="45" r="9" fill={tint} />
    <circle cx="45" cy="45" r="11" fill={accent} />
    <circle cx="45" cy="45" r="4.5" fill="#fff" opacity="0.9" />
  </>
);

const koiPond: Art = ({ tint, accent }) => (
  <>
    <circle cx="32" cy="34" r="24" fill={tint} />
    <path d="M22 34c0-6 6-10 12-10s12 3 12 9c-4 1-7 3-9 6-3-1-6-1-9 0-3-2-6-4-6-5z" fill={accent} />
    <path d="M45 33l7-4v12l-7-4z" fill={accent} />
    <circle cx="27" cy="31" r="2" fill="#fff" />
  </>
);

const sequenceTrack: Art = ({ tint, accent }) => (
  <>
    <circle cx="16" cy="20" r="8" fill={tint} />
    <circle cx="44" cy="16" r="8" fill={tint} />
    <circle cx="48" cy="44" r="8" fill={tint} />
    <circle cx="20" cy="46" r="8" fill={accent} />
    <path d="M20 46l14-9" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 6" />
    <circle cx="20" cy="46" r="3" fill="#fff" />
  </>
);

const oddOneOut: Art = ({ tint, accent }) => (
  <>
    {[
      [16, 16],
      [32, 16],
      [48, 16],
      [16, 32],
      [48, 32],
      [16, 48],
      [32, 48],
      [48, 48],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="6.5" fill={tint} />
    ))}
    <path d="M32 25l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill={accent} />
  </>
);

const flashMatch: Art = ({ tint, accent }) => (
  <>
    <rect x="10" y="18" width="20" height="28" rx="5" fill={tint} />
    <rect x="34" y="18" width="20" height="28" rx="5" fill={tint} />
    <path d="M32 6l-6 22h7l-5 20 14-26h-8l6-16z" fill={accent} />
  </>
);

const quickMath: Art = ({ tint, accent }) => (
  <>
    <rect x="10" y="10" width="44" height="44" rx="10" fill={tint} />
    <path d="M20 24h10M25 19v10" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
    <path d="M35 22h9" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="24" cy="42" r="2.6" fill={accent} />
    <circle cx="40" cy="38" r="2.6" fill={accent} />
    <circle cx="40" cy="46" r="2.6" fill={accent} />
    <path d="M33 41h14" stroke={accent} strokeWidth="3.5" strokeLinecap="round" transform="rotate(-30 40 41)" />
  </>
);

const raindrops: Art = ({ tint, accent }) => (
  <>
    <path d="M20 12c6 8 10 13 10 18a10 10 0 0 1-20 0c0-5 4-10 10-18z" fill={tint} />
    <path d="M44 24c5 6 8 10 8 14a8 8 0 0 1-16 0c0-4 3-8 8-14z" fill={accent} />
    <path d="M14 30a6 6 0 0 0 6 6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
  </>
);

const pinballRecall: Art = ({ tint, accent }) => (
  <>
    <rect x="14" y="8" width="36" height="48" rx="12" fill={tint} />
    <circle cx="26" cy="22" r="4" fill={accent} />
    <circle cx="42" cy="30" r="4" fill={accent} />
    <circle cx="28" cy="42" r="4" fill={accent} />
    <circle cx="38" cy="46" r="6" fill={accent} />
    <circle cx="38" cy="46" r="2.2" fill="#fff" />
  </>
);

const colorClash: Art = ({ tint, accent }) => (
  <>
    <rect x="10" y="20" width="44" height="24" rx="8" fill={tint} />
    <path d="M22 38V26h4l4 8 4-8h4v12" stroke={accent} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="47" cy="16" r="6" fill={accent} />
    <circle cx="16" cy="48" r="5" fill={accent} opacity="0.6" />
  </>
);

const railRouter: Art = ({ tint, accent }) => (
  <>
    <path d="M10 44h18a10 10 0 0 0 10-10V20" stroke={tint} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M10 30h10a10 10 0 0 1 10 10v14" stroke={accent} strokeWidth="5" fill="none" strokeLinecap="round" />
    <circle cx="38" cy="16" r="5" fill={tint} />
    <circle cx="30" cy="54" r="5" fill={accent} />
  </>
);

const ebbFlow: Art = ({ tint, accent }) => (
  <>
    <path d="M6 26c8-8 14 8 22 0s14 8 22 0v10c-8 8-14-8-22 0s-14-8-22 0z" fill={tint} />
    <path d="M8 42c8-8 14 8 22 0s14 8 22 0" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
  </>
);

const ART: Record<string, Art> = {
  'grid-recall': gridRecall,
  'pair-match': pairMatch,
  'sequence-echo': sequenceEcho,
  'koi-pond': koiPond,
  'sequence-track': sequenceTrack,
  'odd-one-out': oddOneOut,
  'flash-match': flashMatch,
  'quick-math': quickMath,
  raindrops: raindrops,
  'pinball-recall': pinballRecall,
  'color-clash': colorClash,
  'rail-router': railRouter,
  'ebb-flow': ebbFlow,
};

/** Per-category two-tone palette for the illustrations. */
const PALETTE: Record<CategoryId, { tint: string; accent: string }> = {
  memory: { tint: '#8fe3d5', accent: '#0d9488' },
  attention: { tint: '#a5e4ff', accent: '#0284c7' },
  speed: { tint: '#ffe0a3', accent: '#ea580c' },
  'problem-solving': { tint: '#a7f3d0', accent: '#059669' },
  flexibility: { tint: '#ffc7dd', accent: '#db2777' },
};

interface Props {
  gameId: string;
  category: CategoryId;
  fallback: string;
  className?: string;
  /** Rendered decoratively; the game title provides the accessible name. */
  title?: string;
}

export function GameArt({ gameId, category, fallback, className, title }: Props) {
  const draw = ART[gameId];
  const palette = PALETTE[category];

  if (!draw) {
    return (
      <span className={className} aria-hidden>
        {fallback}
      </span>
    );
  }

  const decorative = !title;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {draw(palette)}
    </svg>
  );
}
