import { useState } from 'react';
import { teamLogo } from '../lib/logos';

export function TeamLogo({ teamId, name, size = 24 }: { readonly teamId: number; readonly name: string; readonly size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-bg-elevated text-caption font-bold text-text-secondary" style={{ width: size, height: size }}>
        {name.slice(0, 2)}
      </span>
    );
  }
  return <img src={teamLogo(teamId, Math.max(40, size * 2))} alt="" width={size} height={size} loading="lazy" className="shrink-0 object-contain" style={{ width: size, height: size }} onError={() => setFailed(true)} />;
}
