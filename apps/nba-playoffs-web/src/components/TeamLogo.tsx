import { useState } from 'react';
import { logoUrl, teamStyle } from '../lib/teams';

type Props = {
  readonly team: string;
  readonly size?: number;
  readonly className?: string;
};

// Renders a team logo from a public CDN, falling back to a colored crest badge
// (primary color + secondary ring + abbreviation) when no logo is available.
export function TeamLogo({ team, size = 44, className = '' }: Props) {
  const style = teamStyle(team);
  const url = logoUrl(team);
  const [broken, setBroken] = useState(false);
  const dim = { width: size, height: size } as const;

  if (!url || broken) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl font-bold tracking-wide ${className}`}
        style={{ ...dim, backgroundColor: style.primary, color: style.text, boxShadow: `inset 0 0 0 2px ${style.secondary}`, fontSize: size * 0.3 }}
      >
        {style.abbr}
      </span>
    );
  }

  return (
    <span className={`flex shrink-0 items-center justify-center ${className}`} style={dim}>
      <img
        src={url}
        alt={team}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
