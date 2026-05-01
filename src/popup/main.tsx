import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type ConnectState = 'idle' | 'loading' | 'connected' | 'error';

type TokenData = {
  workspace_name: string;
} | null;

function App() {
  const [state, setState] = useState<ConnectState>('idle');
  const [message, setMessage] = useState<string>('');
  const [token, setToken] = useState<TokenData>(null);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TOKEN' });
      if (response?.ok && response.data) {
        setToken(response.data);
        setState('connected');
      }
    } catch {
      // ignore — user hasn't connected yet
    }
  };

  const connectNotion = async () => {
    setState('loading');
    setMessage('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AUTH_CONNECT',
      });

      if (response?.ok) {
        setState('connected');
        setToken(response.data);
        setMessage(`Connected to ${response.data?.workspaceName ?? 'Notion'} ✅`);
      } else {
        setState('error');
        setMessage(response?.error ?? 'Failed to connect');
      }
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const disconnect = async () => {
    setState('loading');
    try {
      await chrome.runtime.sendMessage({ type: 'AUTH_DISCONNECT' });
      setToken(null);
      setState('idle');
      setMessage('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 16, width: 360 }}>
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Notion Capture</h1>

      {state === 'connected' && token ? (
        <>
          <p style={{ margin: '0 0 12px', color: '#0a7d2c' }}>
            {token.workspace_name}
          </p>
          <button
            onClick={disconnect}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          onClick={connectNotion}
          disabled={state === 'loading'}
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '10px 12px',
            cursor: state === 'loading' ? 'not-allowed' : 'pointer',
          }}
        >
          {state === 'loading' ? 'Connecting...' : 'Connect Notion'}
        </button>
      )}

      {message && state !== 'connected' && (
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
