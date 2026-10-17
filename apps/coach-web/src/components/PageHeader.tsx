import type { ReactNode } from 'react';
import { goBack } from '../lib/router';
import { DesktopNav } from './Nav';

type Props = {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly back?: boolean;
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly maxWidth?: string;
};

export function PageHeader({ title, subtitle, back, actions, children, maxWidth = 'max-w-[1500px]' }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg-base/90 backdrop-blur-md">
      <div className={`mx-auto flex ${maxWidth} items-center gap-3 px-4 py-3`}>
        {back && (
          <button onClick={goBack} aria-label="Back" className="-ms-1 flex size-8 shrink-0 items-center justify-center rounded-full text-xl text-text-secondary hover:bg-bg-elevated hover:text-text-primary">
            ‹
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="flex min-w-0 items-center gap-2 truncate text-lg font-bold">{title}</h1>
          {subtitle && <span className="truncate text-xs text-text-muted">{subtitle}</span>}
        </div>
        {actions}
        <DesktopNav />
      </div>
      {children}
    </header>
  );
}
