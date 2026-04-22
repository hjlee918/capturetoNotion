import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function OptionsApp() {
  return (
    <main style={{ fontFamily: 'sans-serif', margin: '2rem auto', maxWidth: 720 }}>
      <h1>Notion Capture Settings</h1>
      <p>Starter options scaffold is ready.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>
);
