import './setup';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startUsageTracking } from './lib/usage';

startUsageTracking();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
