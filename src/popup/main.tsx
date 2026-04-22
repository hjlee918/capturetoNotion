import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 16, width: 360 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Notion Capture</h1>
      <p style={{ color: '#666' }}>Starter popup scaffold is ready.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
