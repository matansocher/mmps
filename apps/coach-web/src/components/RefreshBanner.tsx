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
    <div role="status" aria-live="polite" className="mx-auto max-w-[1500px] px-4 [&:not(:empty)]:pt-5">
      {failed ? (
        <div className="banner-in flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-accent-draw/25 bg-accent-draw/[0.07] px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-draw/15 text-accent-draw">
            <Icon name={offline ? 'wifiOff' : 'serverOff'} size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold text-text-primary">{offline ? t.offlineTitle : t.serverTitle}</p>
            <p className="text-xs text-text-secondary">
              {offline ? t.offlineText : t.serverText}
              <span aria-live="off">
                {lastSuccessAt !== null && (
                  <>
                    {' '}
                    {t.lastUpdate}: <TimeAgo iso={new Date(lastSuccessAt).toISOString()} />
                  </>
                )}
                {!offline && nextRetryAt !== null && (
                  <>
                    {' · '}
                    <Countdown at={nextRetryAt} refreshing={refreshing} />
                  </>
                )}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={refreshing}
            className="shrink-0 rounded-full bg-white/[0.08] px-4 py-2 text-sm font-semibold text-text-primary transition duration-150 ease-out hover:bg-white/[0.12] active:scale-95 disabled:opacity-60"
          >
            {refreshing ? t.retrying : t.retryNow}
          </button>
        </div>
      ) : recovered ? (
        <div className="banner-in mx-auto flex w-fit items-center gap-2 rounded-full border border-accent-live/25 bg-accent-live/10 px-3.5 py-1.5 text-xs font-semibold text-accent-live">
          <Icon name="check" size={14} />
          {recovered === 'offline' ? t.backOnline : t.restored}
        </div>
      ) : null}
    </div>
  );
}
