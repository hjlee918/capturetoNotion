chrome.runtime.onInstalled.addListener(() => {
  console.log('Notion Capture installed');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'AUTH_CONNECT') {
    sendResponse({ ok: true, data: { accountEmail: 'connected@stub.local' } });
    return;
  }

  sendResponse({ ok: false, error: `Unhandled message type: ${message && message.type}` });
});