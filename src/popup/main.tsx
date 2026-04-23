import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

type ConnectState = 'idle' | 'loading' | 'connected' | 'error';

function App() {
  const [state, setState] = useState<ConnectState>('idle');
  const [message, setMessage] = useState<string>('');

  const connectNotion = async () => {
    setState('loading');
    setMessage('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AUTH_CONNECT'
      });

      if (response?.ok) {
        setState('connected');
        setMessage('Connected to Notion ✅');
      } else {
        setState('error');
        setMessage(response?.error ?? 'Failed to connect');
      }
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 16, width: 360 }}>
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Notion Capture</h1>
      <button
        onClick={connectNotion}
        disabled={state === 'loading'}
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '10px 12px',
          cursor: state === 'loading' ? 'not-allowed' : 'pointer'
        }}
      >
        {state === 'loading' ? 'Connecting...' : 'Connect Notion'}
      </button>

      {message && (
        <p style={{ marginTop: 12, color: state === 'error' ? '#b00020' : '#0a7d2c' }}>
          {message}
        </p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);