const PATHS = {
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  minus: 'M19 13H5v-2h14v2z',
  next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  help: 'M11 18h2v-2h-2v2zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 17.93A8 8 0 0 1 4 12c0-.62.08-1.21.21-1.79L9 15v1a2 2 0 0 0 2 2v1.93zm6.9-2.54A2 2 0 0 0 16 16h-1v-3a1 1 0 0 0-1-1H8v-2h2a1 1 0 0 0 1-1V7h2a2 2 0 0 0 2-2v-.41a7.98 7.98 0 0 1 2.9 12.8z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  replay: 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className }: { readonly name: IconName; readonly size?: number; readonly className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
