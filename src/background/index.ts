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
      return { ok: true, data: { accountEmail: 'connected@stub.local' } };

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
