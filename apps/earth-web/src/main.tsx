import './setup';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { trackOpened } from './lib/analytics';
import { initializeTelegram } from './lib/telegram';

initializeTelegram();
trackOpened();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
