import { useState } from 'react';
import { tvChannelLogo } from '../lib/logos';
import { localChannelLogo } from '../lib/tv-channels';
import type { TvChannel } from '../types';

// Logos come in light and dark variants, so they sit on a chip to stay readable on the dark theme.
export function ChannelLogo({ channel, height = 16 }: { readonly channel: TvChannel; readonly height?: number }) {
  const [failed, setFailed] = useState(false);
  const local = localChannelLogo(channel.name);
  const chip = local?.chip === 'dark' ? 'bg-[#24163a]' : 'bg-white';
  return (
    <span className={`inline-flex shrink-0 items-center rounded px-1 py-0.5 ${chip}`} title={channel.name}>
      {failed ? (
        <span className="font-bold leading-none whitespace-nowrap text-black" style={{ fontSize: height * 0.7, lineHeight: `${height}px` }}>
          {channel.name}
        </span>
      ) : (
        <img
          src={local?.src ?? tvChannelLogo(channel.id, height)}
          alt={channel.name}
          loading="lazy"
          className="w-auto max-w-16 object-contain"
          style={{ height }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
