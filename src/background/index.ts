import { connectNotion, clearToken, getStoredToken } from './notion/auth';
import { getForms, getHistory, getSettings } from './storage';

type ExtensionMessage = { type?: string };

type MessageResponse = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

async function handleMessage(message: ExtensionMessage): Promise<MessageResponse> {
  switch (message.type) {
    case 'AUTH_CONNECT':
      try {
        const token = await connectNotion();
        return { ok: true, data: { workspaceName: token.workspace_name } };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }

    case 'AUTH_DISCONNECT':
      await clearToken();
      return { ok: true };

    case 'GET_TOKEN':
      return { ok: true, data: await getStoredToken() };

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message as ExtensionMessage)
    .then((response) => sendResponse(response))
    .catch((error) =>
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
    );

  return true;
});
