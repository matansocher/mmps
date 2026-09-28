type IconName = 'home' | 'chart' | 'settings' | 'play' | 'star' | 'arrow' | 'check' | 'pause' | 'sound' | 'muted' | 'help' | 'close' | 'sun' | 'moon' | 'spark' | 'leaf' | 'share';
const paths: Record<IconName, string> = {
  home: 'm3 10 9-7 9 7v10H6V10m3 10v-7h6v7',
  chart: 'M4 20V11m8 9V4m8 16v-7',
  settings: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  play: 'm8 4 12 8-12 8Z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  pause: 'M8 5v14M16 5v14',
  sound: 'M4 9h4l5-4v14l-5-4H4Zm13-2a7 7 0 0 1 0 10',
  muted: 'M4 9h4l5-4v14l-5-4H4Zm13 1 4 4m0-4-4 4',
  help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  close: 'm6 6 12 12M6 18 18 6',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  leaf: 'M19 4C7 2 2 8 5 15s14 5 14-11ZM5 20l9-11',
  share: 'M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7',
};
export function Icon({ name, size = 22, filled = false }: { readonly name: IconName; readonly size?: number; readonly filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
