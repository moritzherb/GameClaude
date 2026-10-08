import '@fontsource-variable/archivo';
import '@fontsource-variable/big-shoulders-display';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RoomProvider } from './net/RoomProvider';
import { AppProvider } from './state/AppState';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <RoomProvider>
        <App />
      </RoomProvider>
    </AppProvider>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
