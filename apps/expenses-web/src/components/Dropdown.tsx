import { useEffect, useId, useRef, useState } from 'react';
import { haptic } from '../lib/telegram';

export type DropdownOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  readonly emoji?: string;
};

type Props<T extends string> = {
  readonly value: T;
  readonly options: ReadonlyArray<DropdownOption<T>>;
  readonly onChange: (value: T) => void;
  readonly label?: string;
  readonly className?: string;
  readonly disabled?: boolean;
};

export function Dropdown<T extends string>({ value, options, onChange, label, className = '', disabled }: Props<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(v: T) {
    haptic('select');
    onChange(v);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-xl bg-bg-elevated border border-border-subtle px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary disabled:opacity-50"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.emoji && <span className="text-base leading-none">{selected.emoji}</span>}
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
        <span className={`text-text-muted text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div
          ref={popoverRef}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-64 overflow-y-auto rounded-xl bg-bg-card border border-border-subtle shadow-lg animate-fade-in"
        >
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => pick(o.value)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                  isSel ? 'bg-accent-primary/15 text-accent-primary' : 'text-text-primary hover:bg-bg-elevated'
                }`}
              >
                {o.emoji && <span className="text-base leading-none shrink-0">{o.emoji}</span>}
                <span className="flex-1 truncate">{o.label}</span>
                {isSel && <span className="text-accent-primary text-xs shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
