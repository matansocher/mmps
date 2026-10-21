import { useState } from 'react';
import { leagueColor } from '../lib/league-themes';
import { competitionLogo } from '../lib/logos';

export function CompetitionLogo({ competitionId, size = 16 }: { readonly competitionId: number; readonly size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="shrink-0 rounded-full" style={{ width: size / 2, height: size / 2, backgroundColor: leagueColor(competitionId) }} aria-hidden />;
  }
  return <img src={competitionLogo(competitionId, Math.max(32, size * 2))} alt="" width={size} height={size} loading="lazy" className="shrink-0 object-contain" style={{ width: size, height: size }} onError={() => setFailed(true)} />;
}
