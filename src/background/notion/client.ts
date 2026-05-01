import { getStoredToken } from './auth';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export class NotionError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string
  ) {
    super(message);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) {
    throw new NotionError(401, null, 'Not authenticated');
  }
  return {
    Authorization: `Bearer ${token.token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export async function notionFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message?: string }).message === 'string'
        ? (body as { message: string }).message
        : `Notion API error: ${response.status}`;
    throw new NotionError(response.status, body, message);
  }

  return (await response.json()) as T;
}
