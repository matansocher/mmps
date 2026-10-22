import { useState } from 'react';
import { athletePhoto } from '../lib/logos';

export function PlayerPhoto({ athleteId, name, size = 32, className = '' }: { readonly athleteId?: number; readonly name: string; readonly size?: number; readonly className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!athleteId || failed) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-bg-elevated text-caption font-bold text-text-secondary ${className}`} style={{ width: size, height: size }}>
        {name
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)}
      </span>
    );
  }
  return (
    <img
      src={athletePhoto(athleteId, size)}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-full bg-bg-elevated object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
