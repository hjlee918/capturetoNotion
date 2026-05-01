import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type ConnectState = 'idle' | 'loading' | 'connected' | 'error';

type TokenData = {
  token: string;
  user_name: string;
  user_email?: string;
  connected_at: number;
} | null;

type NotionDatabase = {
  id: string;
  title: { plain_text: string }[];
};

function formatDbTitle(db: NotionDatabase): string {
  return db.title.map((t) => t.plain_text).join('') || 'Untitled';
}

function App() {
  const [state, setState] = useState<ConnectState>('idle');
  const [message, setMessage] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [token, setToken] = useState<TokenData>(null);

  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [loadingDbs, setLoadingDbs] = useState(false);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TOKEN' });
      if (response?.ok && response.data) {
        setToken(response.data);
        setState('connected');
        void loadDatabases();
        void loadSelectedDatabase();
      }
    } catch {
      // ignore
    }
  };

  const loadDatabases = async () => {
    setLoadingDbs(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'LIST_DATABASES' });
      if (response?.ok) {
        setDatabases(response.data as NotionDatabase[]);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDbs(false);
    }
  };

  const loadSelectedDatabase = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SELECTED_DATABASE' });
      if (response?.ok && response.data) {
        setSelectedDb(response.data as string);
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
        void loadDatabases();
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
      setDatabases([]);
      setSelectedDb('');
      setState('idle');
      setMessage('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const handleDbChange = async (id: string) => {
    setSelectedDb(id);
    try {
      await chrome.runtime.sendMessage({ type: 'SET_SELECTED_DATABASE', databaseId: id });
    } catch {
      // ignore
    }
  };

  const savePage = async () => {
    if (!selectedDb) return;
    setSaveState('saving');
    setSaveMessage('');

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.title) {
        setSaveState('error');
        setSaveMessage('No active tab found');
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_PAGE',
        databaseId: selectedDb,
        title: tab.title,
        url: tab.url ?? '',
      });

      if (response?.ok) {
        setSaveState('saved');
        setSaveMessage('Saved to Notion');
        const pageUrl = (response.data as { url: string }).url;
        if (pageUrl) {
          void chrome.tabs.create({ url: pageUrl });
        }
      } else {
        setSaveState('error');
        setSaveMessage(response?.error ?? 'Failed to save');
      }
    } catch (err) {
      setSaveState('error');
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save');
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

          {databases.length === 0 ? (
            <>
              <p style={{ color: '#666', fontSize: 14 }}>
                No databases shared yet. In Notion, open a database and use
                Connections to share it.
              </p>
              <button
                onClick={loadDatabases}
                disabled={loadingDbs}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: loadingDbs ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                {loadingDbs ? 'Refreshing...' : 'Refresh'}
              </button>
            </>
          ) : (
            <>
              <label
                htmlFor="db"
                style={{ display: 'block', marginBottom: 6, fontSize: 14 }}
              >
                Save target
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select
                  id="db"
                  value={selectedDb}
                  onChange={(e) => handleDbChange(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  <option value="">Select a database...</option>
                  {databases.map((db) => (
                    <option key={db.id} value={db.id}>
                      {formatDbTitle(db)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadDatabases}
                  disabled={loadingDbs}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    padding: '0 12px',
                    cursor: loadingDbs ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                  }}
                  title="Refresh database list"
                >
                  {loadingDbs ? '⟳' : '↻'}
                </button>
              </div>

              {selectedDb && (
                <button
                  onClick={savePage}
                  disabled={saveState === 'saving'}
                  style={{
                    width: '100%',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                  }}
                >
                  {saveState === 'saving' ? 'Saving...' : 'Save this page'}
                </button>
              )}

              {saveMessage && (
                <p
                  style={{
                    marginTop: 12,
                    color: saveState === 'error' ? '#b00020' : '#0a7d2c',
                  }}
                >
                  {saveMessage}
                </p>
              )}
            </>
          )}

          <button
            onClick={disconnect}
            style={{
              marginTop: 16,
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              fontSize: 13,
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
