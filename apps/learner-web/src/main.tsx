import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getWebApp } from './lib/telegram';
import './index.css';

// Signal readiness and expand the mini-app to full height before React mounts.
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
