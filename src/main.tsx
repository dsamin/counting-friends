import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootNative } from './native/bootNative';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Native-only boot steps (status bar, splash). No-op on the web build.
void bootNative();
