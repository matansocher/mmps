import { useEffect, useState } from 'react';
import { cloudDiag } from '../lib/storage';
import { getWebApp } from '../lib/telegram';

// Opt-in diagnostics overlay. Enabled by adding ?debug=1 to the mini-app URL.
// Polls the shared cloudDiag snapshot so you can see, on the actual client,
// whether CloudStorage is detected and whether the fetch succeeded.
export function DebugOverlay() {
  const enabled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
  const [, force] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [enabled]);

  if (!enabled) return null;

  const w = getWebApp();
  const rows: [string, string][] = [
    ['platform', (w as unknown as { platform?: string })?.platform ?? 'n/a'],
    ['version', cloudDiag.version || 'n/a'],
    ['hasWebApp', String(cloudDiag.hasWebApp)],
    ['hasCloudStorage', String(cloudDiag.hasCloudStorage)],
    ['gatePassed(≥6.9)', String(cloudDiag.gatePassed)],
    ['usedGetItems', String(cloudDiag.usedGetItems)],
    ['lastResult', cloudDiag.lastResult],
    ['coursesFound', String(cloudDiag.courseKeysFound)],
    ['lastError', cloudDiag.lastError || '—'],
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        right: 8,
        bottom: 8,
        zIndex: 9999,
        background: 'rgba(10,12,17,0.95)',
        border: '1px solid #333c4b',
        borderRadius: 12,
        padding: '10px 12px',
        font: '11px/1.5 ui-monospace, monospace',
        color: '#c3cad6',
      }}
    >
      <div style={{ fontWeight: 700, color: '#7c8cff', marginBottom: 4 }}>CloudStorage debug</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#828d9e' }}>{k}</span>
          <span style={{ textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
