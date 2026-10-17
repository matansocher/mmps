import { useState } from 'react';
import { tvChannelLogo } from '../lib/logos';
import type { TvChannel } from '../types';

// Logos come in light and dark variants, so they sit on a white chip to stay readable on the dark theme.
export function ChannelLogo({ channel, height = 16 }: { readonly channel: TvChannel; readonly height?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-white px-1 py-0.5" title={channel.name}>
      {failed ? (
        // 365 has no logo for some channels (e.g. "5 Stars", "Sport 6"), so show the name in the same chip.
        <span className="font-bold leading-none whitespace-nowrap text-black" style={{ fontSize: height * 0.7, lineHeight: `${height}px` }}>
          {channel.name}
        </span>
      ) : (
        <img src={tvChannelLogo(channel.id, height)} alt={channel.name} loading="lazy" className="w-auto max-w-16 object-contain" style={{ height }} onError={() => setFailed(true)} />
      )}
    </span>
  );
}
