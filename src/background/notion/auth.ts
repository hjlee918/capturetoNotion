import { NOTION_CLIENT_ID, OAUTH_WORKER_URL } from '../../shared/config';

const TOKEN_STORAGE_KEY = 'notion_token';

export type NotionToken = {
  access_token: string;
  workspace_id: string;
  workspace_name: string;
  bot_id: string;
};

function getRedirectUri(): string {
  return `https://${chrome.runtime.id}.chromiumapp.org/`;
}

export async function connectNotion(): Promise<NotionToken> {
  const redirectUri = getRedirectUri();
  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
  authUrl.searchParams.set('client_id', NOTION_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');

  const callbackUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  if (!callbackUrl) {
    throw new Error('OAuth flow was cancelled or failed');
  }

  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  if (!code) {
    throw new Error('No authorization code received from Notion');
  }

  return exchangeCodeForToken(code);
}

async function exchangeCodeForToken(code: string): Promise<NotionToken> {
  const redirectUri = getRedirectUri();
  const response = await fetch(`${OAUTH_WORKER_URL}/oauth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const token: NotionToken = await response.json();
  await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: token });
  return token;
}

export async function getStoredToken(): Promise<NotionToken | null> {
  const result = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
  return (result[TOKEN_STORAGE_KEY] as NotionToken | undefined) ?? null;
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_STORAGE_KEY);
}
