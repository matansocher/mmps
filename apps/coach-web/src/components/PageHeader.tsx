import { type ReactNode, useEffect, useRef } from 'react';
import { useT } from '../lib/i18n';
import { goBack } from '../lib/router';
import { Icon } from './Icon';

type Props = {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly back?: boolean;
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly maxWidth?: string;
};

export function PageHeader({ title, subtitle, back, actions, children, maxWidth = 'max-w-[1500px]' }: Props) {
  const t = useT();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const text = headingRef.current?.textContent?.trim();
    document.title = text ? `${text} · ${t.nav.brand}` : t.nav.brand;
  });
  return (
    <header className="sticky top-0 z-20 md:top-14 border-b border-border-subtle bg-bg-base/90 backdrop-blur-md">
      <div className={`mx-auto flex ${maxWidth} items-center gap-3 px-4 py-3`}>
        {back && (
          <button onClick={goBack} aria-label={t.common.back} className="-ms-1 flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary">
            <Icon name="back" size={20} className="rtl:-scale-x-100" />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 ref={headingRef} tabIndex={-1} className="flex min-w-0 items-center gap-2 truncate text-lg font-bold">{title}</h1>
          {subtitle && <span className="line-clamp-2 text-xs text-text-secondary">{subtitle}</span>}
        </div>
        {actions}
      </div>
      {children}
    </header>
  );
}
