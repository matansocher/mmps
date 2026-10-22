import type { RecoveredFrom } from '../hooks/useDashboard';
import { useNow } from '../hooks/useNow';
import { useT } from '../lib/i18n';
import { Icon } from './Icon';
import { TimeAgo } from './TimeAgo';

type Props = {
  readonly failed: boolean;
  readonly online: boolean;
  readonly refreshing: boolean;
  readonly lastSuccessAt: number | null;
  readonly nextRetryAt: number | null;
  readonly recovered: RecoveredFrom | null;
  readonly onRetry: () => void;
};

function Countdown({ at, refreshing }: { readonly at: number; readonly refreshing: boolean }) {
  const now = useNow(1000);
  const t = useT().dashboard.banner;
  const seconds = Math.max(0, Math.ceil((at - now) / 1000));
  return <span className="tabular-nums">{refreshing || seconds === 0 ? t.retrying : t.retryIn(seconds)}</span>;
}

// Always mounted so screen readers announce it when it appears; the ticking parts are aria-live="off".
export function RefreshBanner({ failed, online, refreshing, lastSuccessAt, nextRetryAt, recovered, onRetry }: Props) {
  const t = useT().dashboard.banner;
  const offline = !online;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
      {failed ? (
        <div className="banner-in pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-line-strong bg-bg-elevated py-1.5 ps-3.5 pe-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)]">
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-accent-warn/60 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-accent-warn" />
          </span>
          <Icon name={offline ? 'wifiOff' : 'serverOff'} size={15} className="shrink-0 text-text-secondary" />
          <p className="min-w-0 flex-1 text-xs leading-tight" title={offline ? t.offlineText : t.serverText}>
            <span className="font-semibold text-text-primary">{offline ? t.offlineTitle : t.serverTitle}</span>
            <span className="sr-only"> {offline ? t.offlineText : t.serverText}</span>
            <span className="block truncate text-caption text-text-secondary" aria-live="off">
              {lastSuccessAt !== null && (
                <>
                  {t.lastUpdate}: <TimeAgo iso={new Date(lastSuccessAt).toISOString()} />
                </>
              )}
              {!offline && nextRetryAt !== null && (
                <>
                  {lastSuccessAt !== null && ' · '}
                  <Countdown at={nextRetryAt} refreshing={refreshing} />
                </>
              )}
            </span>
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={refreshing}
            className="h-8 shrink-0 rounded-full bg-surface-2 px-3 text-xs font-semibold text-text-primary transition duration-150 ease-out hover:bg-surface-3 active:scale-95 disabled:opacity-60"
          >
            {refreshing ? t.retrying : t.retryNow}
          </button>
        </div>
      ) : recovered ? (
        <div className="banner-in pointer-events-auto flex items-center gap-2 rounded-full border border-line-strong bg-bg-elevated px-3.5 py-2 text-xs font-semibold text-text-primary shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)]">
          <Icon name="check" size={14} className="text-accent-live" />
          {recovered === 'offline' ? t.backOnline : t.restored}
        </div>
      ) : null}
    </div>
  );
}
