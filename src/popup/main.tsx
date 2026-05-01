import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type ConnectState = 'idle' | 'loading' | 'connected' | 'error';

type TokenData = {
  token: string;
  user_name: string;
  user_email?: string;
  connected_at: number;
} | null;

function App() {
  const [state, setState] = useState<ConnectState>('idle');
  const [message, setMessage] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
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
      // ignore
    }
  };

  const connectNotion = async () => {
    setState('loading');
    setMessage('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AUTH_CONNECT',
        token: tokenInput.trim(),
      });

      if (response?.ok) {
        setState('connected');
        setToken(response.data);
        setMessage('');
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
      setTokenInput('');
      setState('idle');
      setMessage('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const openIntegrationsPage = () => {
    void chrome.tabs.create({
      url: 'https://www.notion.so/my-integrations',
    });
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 16, width: 360 }}>
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Notion Capture</h1>

      {state === 'connected' && token ? (
        <>
          <p style={{ margin: '0 0 12px', color: '#0a7d2c' }}>
            Connected as <strong>{token.user_name}</strong>
            {token.user_email && <span> ({token.user_email})</span>}
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
          <p
            style={{
              marginTop: 16,
              padding: 12,
              background: '#f6f6f6',
              borderRadius: 8,
              fontSize: 13,
              color: '#555',
            }}
          >
            Tip: share a Notion page or database with this integration in
            Notion to give it access.
          </p>
        </>
      ) : (
        <>
          <label
            htmlFor="token"
            style={{ display: 'block', marginBottom: 6, fontSize: 14 }}
          >
            Notion Integration Token
          </label>
          <input
            id="token"
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="secret_... or ntn_..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 12,
            }}
          />
          <button
            onClick={connectNotion}
            disabled={state === 'loading' || !tokenInput.trim()}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '10px 12px',
              cursor:
                state === 'loading' || !tokenInput.trim()
                  ? 'not-allowed'
                  : 'pointer',
              width: '100%',
            }}
          >
            {state === 'loading' ? 'Verifying...' : 'Connect'}
          </button>

          {message && (
            <p
              style={{
                marginTop: 12,
                color: state === 'error' ? '#b00020' : '#0a7d2c',
              }}
            >
              {message}
            </p>
          )}

          <p style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
            Get your token at{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openIntegrationsPage();
              }}
              style={{ color: '#0066cc' }}
            >
              notion.so/my-integrations
            </a>
          </p>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
