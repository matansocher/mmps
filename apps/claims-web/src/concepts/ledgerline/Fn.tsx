import { useLang } from '../../lib/i18n.tsx';
import { copy } from './copy.ts';

export function Fn({ n, refId }: { readonly n: number; readonly refId?: string }) {
  const { t } = useLang();
  return (
    <sup className="ll-fn">
      <a href={`#ll-fn-${n}`} id={refId} aria-label={`${t(copy.sourceNote)} ${n}`}>
        {n}
      </a>
    </sup>
  );
}
