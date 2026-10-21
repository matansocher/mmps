import type { TvChannel } from '../types';
import { useT } from '../lib/i18n';
import { Icon } from './Icon';

export function ChannelBadge({ channels, className = '' }: { readonly channels: readonly TvChannel[]; readonly className?: string }) {
  const t = useT();
  if (channels.length === 0) return null;
  const names = channels.map((channel) => channel.name).join(', ');
  return (
    <span title={names} className={`flex h-6 min-w-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 text-xs text-text-primary ${className}`}>
      <Icon name="tv" size={13} className="shrink-0 text-text-secondary" />
      <span className="sr-only">{t.game.tv}: </span>
      <span className="min-w-0 truncate">{names}</span>
    </span>
  );
}
