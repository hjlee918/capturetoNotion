import type { ExtractedPage } from '../shared/types';
import { saveToken, clearToken, getStoredToken } from './notion/auth';
import { listDatabases } from './notion/databases';
import { createPage } from './notion/pages';
import { getForms, getHistory, getSettings } from './storage';

type ExtensionMessage = {
  type?: string;
  token?: string;
  databaseId?: string;
  title?: string;
  url?: string;
  selectionText?: string;
};

type MessageResponse = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

const SELECTED_DB_KEY = 'selected_database';

async function handleMessage(message: ExtensionMessage): Promise<MessageResponse> {
  switch (message.type) {
    case 'AUTH_CONNECT': {
      const token = message.token;
      if (!token) {
        return { ok: false, error: 'No token provided' };
      }
      try {
        await saveToken(token);
        const stored = await getStoredToken();
        return { ok: true, data: stored };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    case 'AUTH_DISCONNECT':
      await clearToken();
      return { ok: true };

    case 'GET_TOKEN':
      return { ok: true, data: await getStoredToken() };

    case 'LIST_DATABASES':
      try {
        const databases = await listDatabases();
        return { ok: true, data: databases };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }

    case 'SET_SELECTED_DATABASE': {
      if (!message.databaseId) {
        return { ok: false, error: 'No databaseId provided' };
      }
      await chrome.storage.local.set({ [SELECTED_DB_KEY]: message.databaseId });
      return { ok: true };
    }

    case 'GET_SELECTED_DATABASE': {
      const result = await chrome.storage.local.get(SELECTED_DB_KEY);
      return { ok: true, data: result[SELECTED_DB_KEY] ?? null };
    }

    case 'EXTRACT_AND_SAVE':
      return handleExtractAndSave(message.selectionText);

    case 'CREATE_PAGE': {
      const databaseId = message.databaseId;
      const title = message.title;
      const url = message.url;
      if (!databaseId || !title) {
        return { ok: false, error: 'Missing databaseId or title' };
      }
      try {
        const extracted: ExtractedPage = {
          title,
          url: url ?? '',
        };
        const page = await createPage({ databaseId, extracted });
        return { ok: true, data: page };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    case 'GET_FORMS':
      return { ok: true, data: await getForms() };

    case 'GET_HISTORY':
      return { ok: true, data: await getHistory() };

    case 'GET_SETTINGS':
      return { ok: true, data: await getSettings() };

    default:
      return { ok: false, error: `Unhandled message type: ${message.type}` };
  }
}

async function handleExtractAndSave(selectionText?: string): Promise<MessageResponse> {
  const dbResult = await chrome.storage.local.get(SELECTED_DB_KEY);
  const databaseId = dbResult[SELECTED_DB_KEY] as string | undefined;
  if (!databaseId) {
    return { ok: false, error: 'No save target. Pick a database in the popup.' };
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    return { ok: false, error: 'No active tab' };
  }

  let extracted: ExtractedPage;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
    if (!response?.ok) {
      return { ok: false, error: response?.error ?? 'Extraction failed' };
    }
    extracted = response.data as ExtractedPage;
  } catch {
    // If content script isn't loaded, fall back to basic tab data
    extracted = {
      title: tab.title ?? 'Untitled',
      url: tab.url ?? '',
      selection: selectionText,
    };
  }

  if (selectionText) {
    extracted.selection = selectionText;
  }

  try {
    const page = await createPage({ databaseId, extracted });
    return { ok: true, data: page };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message as ExtensionMessage)
    .then((response) => sendResponse(response))
    .catch((error) =>
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
    );

  return true;
});
