const TOKEN_STORAGE_KEY = 'notion_token';

export type NotionUser = {
  name: string;
  type: string;
  person?: { email?: string };
};

export type StoredToken = {
  token: string;
  user_name: string;
  user_email?: string;
  connected_at: number;
};

function isValidTokenFormat(token: string): boolean {
  return token.startsWith('ntn_') || token.startsWith('secret_');
}

export async function verifyToken(token: string): Promise<{ ok: true; user: NotionUser } | { ok: false; error: string }> {
  if (!token || !isValidTokenFormat(token)) {
    return { ok: false, error: 'Token must start with "ntn_" or "secret_"' };
  }

  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Notion API error: ${response.status} ${body}` };
    }

    const data = (await response.json()) as { name: string; type: string; person?: { email?: string } };
    return { ok: true, user: { name: data.name, type: data.type, person: data.person } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveToken(token: string): Promise<void> {
  if (!token || !isValidTokenFormat(token)) {
    throw new Error('Invalid token format');
  }

  const result = await verifyToken(token);
  if (!result.ok) {
    throw new Error(result.error);
  }

  const stored: StoredToken = {
    token,
    user_name: result.user.name,
    user_email: result.user.person?.email,
    connected_at: Date.now(),
  };

  await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: stored });
}

export async function getStoredToken(): Promise<StoredToken | null> {
  const result = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
  return (result[TOKEN_STORAGE_KEY] as StoredToken | undefined) ?? null;
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_STORAGE_KEY);
}
