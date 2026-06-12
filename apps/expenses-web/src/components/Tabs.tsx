import { haptic } from '../lib/telegram';

export type TabItem<T extends string> = {
  readonly id: T;
  readonly label: string;
};

type Props<T extends string> = {
  readonly tabs: ReadonlyArray<TabItem<T>>;
  readonly selected: T;
  readonly onSelect: (id: T) => void;
};

export function Tabs<T extends string>({ tabs, selected, onSelect }: Props<T>) {
  return (
    <div className="inline-flex p-1 bg-bg-elevated rounded-xl border border-border-subtle w-full">
      {tabs.map((tab) => {
        const active = tab.id === selected;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (active) return;
              haptic('select');
              onSelect(tab.id);
            }}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              active ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
