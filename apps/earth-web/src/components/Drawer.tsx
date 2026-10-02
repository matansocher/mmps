import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Drawer({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  return (
    <aside
      aria-label={title}
      className="glass fixed z-20 flex flex-col overflow-hidden rounded-2xl sm:top-20 sm:bottom-12 sm:left-20 sm:w-[340px] max-sm:right-2 max-sm:bottom-[76px] max-sm:left-2 max-sm:max-h-[55vh]"
    >
      <header className="flex items-center justify-between border-b border-white/10 py-2 pr-2 pl-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <button type="button" className="icon-btn h-9 w-9" aria-label="Close panel" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}

export function Toggle({ label, checked, onChange, hint }: { readonly label: string; readonly checked: boolean; readonly onChange: (v: boolean) => void; readonly hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/5">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-white/45">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-white/20 transition-colors peer-checked:bg-[var(--color-accent-strong)] peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--color-accent)] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

export function SectionTitle({ children }: { readonly children: ReactNode }) {
  return <h3 className="px-4 pt-4 pb-1 text-xs font-medium tracking-wide text-white/45 uppercase">{children}</h3>;
}
