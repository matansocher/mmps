import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/utils';

type Variant = 'primary' | 'ghost' | 'soft';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  accent?: string;
}

export function Button({ variant = 'primary', accent = '#0d9488', className, style, ...rest }: Props) {
  const base =
    'ml-tap inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none';

  if (variant === 'primary') {
    return (
      <button
        className={cx(base, 'text-white shadow-lg', className)}
        style={{ background: accent, boxShadow: `0 10px 24px -8px ${accent}`, ...style }}
        {...rest}
      />
    );
  }

  if (variant === 'soft') {
    return (
      <button
        className={cx(base, className)}
        style={{ background: `${accent}1a`, color: accent, ...style }}
        {...rest}
      />
    );
  }

  return (
    <button
      className={cx(
        base,
        'bg-white/70 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:ring-white/15 dark:hover:bg-white/20',
        className,
      )}
      style={style}
      {...rest}
    />
  );
}
