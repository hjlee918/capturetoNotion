import { extractPage } from './extractors';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ((message as { type?: string })?.type === 'EXTRACT_PAGE') {
    sendResponse({
      ok: true,
      data: extractPage(),
    });
  }
});
