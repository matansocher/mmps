/**
 * Small inline-SVG glyphs used *inside* the games, replacing emoji so the art
 * is original, crisp and on-brand. Each accepts a className for sizing and uses
 * `currentColor` (or an explicit color prop) so it inherits the game palette.
 */

interface GlyphProps {
  className?: string;
  color?: string;
}

function svgProps(className?: string) {
  return {
    viewBox: '0 0 24 24',
    className,
    'aria-hidden': true,
    xmlns: 'http://www.w3.org/2000/svg',
  } as const;
}

/* --- Pair Match tokens: eight distinct shape/color pairs --------------- */

export type TokenKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'star'
  | 'heart'
  | 'diamond'
  | 'drop'
  | 'hexagon';

export const TOKEN_KINDS: TokenKind[] = [
  'circle',
  'square',
  'triangle',
  'star',
  'heart',
  'diamond',
  'drop',
  'hexagon',
];

const TOKEN_COLORS: Record<TokenKind, string> = {
  circle: '#ef4444',
  square: '#f59e0b',
  triangle: '#10b981',
  star: '#eab308',
  heart: '#ec4899',
  diamond: '#0ea5e9',
  drop: '#6366f1',
  hexagon: '#14b8a6',
};

export function Token({ kind, className }: { kind: TokenKind; className?: string }) {
  const c = TOKEN_COLORS[kind];
  const shapes: Record<TokenKind, React.ReactElement> = {
    circle: <circle cx="12" cy="12" r="8" fill={c} />,
    square: <rect x="4" y="4" width="16" height="16" rx="3.5" fill={c} />,
    triangle: <path d="M12 4l8 15H4z" fill={c} />,
    star: <path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.1 6L12 17.8 6.6 19.6l1.1-6L3.3 9.4l6.1-.8z" fill={c} />,
    heart: <path d="M12 20S3.5 14.5 3.5 8.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8.5 2.8C20.5 14.5 12 20 12 20z" fill={c} />,
    diamond: <path d="M12 3l8 9-8 9-8-9z" fill={c} />,
    drop: <path d="M12 3c4 5 6.5 8 6.5 11a6.5 6.5 0 0 1-13 0C5.5 11 8 8 12 3z" fill={c} />,
    hexagon: <path d="M8 4h8l4 8-4 8H8l-4-8z" fill={c} />,
  };
  return <svg {...svgProps(className)}>{shapes[kind]}</svg>;
}

/* --- Target Tap -------------------------------------------------------- */

/** Filled star target the player should tap. */
export function TargetStar({ className, color = '#fff' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path
        d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.1 6L12 17.8 6.6 19.6l1.1-6L3.3 9.4l6.1-.8z"
        fill={color}
      />
    </svg>
  );
}

/** Spiky burst marking a decoy the player should avoid. */
export function Burst({ className, color = '#fff' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path
        d="M12 2l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z"
        fill={color}
      />
    </svg>
  );
}

/* --- Koi Pond ---------------------------------------------------------- */

export function Koi({ className, color = '#fb923c' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M4 12c0-3 3-5 6-5s6 1.5 6 4.5c-2 .5-3.5 1.5-4.5 3-1.5-.5-3-.5-4.5 0C6 14 4 13 4 12z" fill={color} />
      <path d="M15 11l5-3v8l-5-3z" fill={color} />
      <circle cx="8" cy="10.5" r="1" fill="#fff" />
    </svg>
  );
}

/** A fed/sleeping koi: faded body with "z" marks. */
export function KoiFed({ className, color = '#94a3b8' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M4 13c0-3 3-5 6-5s6 1.5 6 4.5c-2 .5-3.5 1.5-4.5 3-1.5-.5-3-.5-4.5 0C6 15 4 14 4 13z" fill={color} opacity="0.6" />
      <path d="M15 12l5-3v8l-5-3z" fill={color} opacity="0.6" />
      <path d="M15 4h4l-4 4h4" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* --- Eagle Eye --------------------------------------------------------- */

export function Bird({ className, color = '#334155' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M3 14c4-5 7-5 9-1 2-4 5-4 9 1-4 1-6 3-9 3s-5-2-9-3z" fill={color} />
      <circle cx="12" cy="13" r="1.6" fill="#fff" />
    </svg>
  );
}

/* --- Rail Router ------------------------------------------------------- */

export function Station({ className, color = '#fff' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M12 4l8 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z" fill={color} />
    </svg>
  );
}

export function Train({ className, color = '#fff' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <rect x="5" y="5" width="14" height="11" rx="3" fill={color} />
      <rect x="7.5" y="7.5" width="9" height="4" rx="1.2" fill="#000" opacity="0.25" />
      <circle cx="9" cy="19" r="1.8" fill={color} />
      <circle cx="15" cy="19" r="1.8" fill={color} />
    </svg>
  );
}

/* --- Pinball Recall ---------------------------------------------------- */

export function Ball({ className, color = '#ef4444' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="12" cy="12" r="8" fill={color} />
      <circle cx="9.5" cy="9.5" r="2.4" fill="#fff" opacity="0.7" />
    </svg>
  );
}

/* --- Streak / combo flame (SkyFlock, EbbFlow) -------------------------- */

export function Flame({ className, color = 'currentColor' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M13 2c1 4-2 5-2 8a3 3 0 0 0 5 2c1 3-1 8-4 8-4 0-6-3-6-6 0-5 5-6 7-12z" fill={color} />
    </svg>
  );
}

/* --- Life pips (Raindrops drop, Brew Rush cup) ------------------------- */

export function DropPip({ className, color = 'currentColor' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M12 3c4 5 6.5 8 6.5 11a6.5 6.5 0 0 1-13 0C5.5 11 8 8 12 3z" fill={color} />
    </svg>
  );
}

export function CupPip({ className, color = 'currentColor' }: GlyphProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M5 7h11v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" fill={color} />
      <path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
