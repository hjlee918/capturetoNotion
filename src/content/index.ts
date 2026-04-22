chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ((message as { type?: string })?.type === 'GET_CAPTURE_SESSION') {
    sendResponse({
      ok: true,
      data: {
        tabId: -1,
        url: window.location.href,
        title: document.title,
        extractorVersion: '0.1.0',
        extractedAt: new Date().toISOString()
      }
    });
  }
});
