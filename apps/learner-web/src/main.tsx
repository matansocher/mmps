import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getWebApp } from './lib/telegram';
import './index.css';

// Signal readiness BEFORE React mounts. Telegram Web/Desktop only service the
// CloudStorage bridge after ready(), and child effects (ProgressProvider's cloud
// fetch) run before parent effects — so calling ready() here guarantees it
// happens before any CloudStorage access.
const wa = getWebApp();
if (wa) {
  wa.ready();
  wa.expand();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
