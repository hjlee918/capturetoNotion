import type { ExtractedPage } from '../../shared/types';
import { extractGeneric } from './generic';

function getTweetText(): string | undefined {
  // Try multiple selectors — X/Twitter DOM changes frequently
  const el =
    document.querySelector('[data-testid="tweetText"]') ||
    document.querySelector('article [lang] div[dir="auto"]') ||
    document.querySelector('article div[dir="auto"][style]');
  return el?.textContent?.trim() || undefined;
}

function getAuthorHandle(): string | undefined {
  const el =
    document.querySelector('[data-testid="User-Names"] a[href^="/"]') ||
    document.querySelector('article a[href^="/"]');
  const href = el?.getAttribute('href');
  if (href) return href.replace(/^\//, '');
  return undefined;
}

function getAuthorName(): string | undefined {
  const el =
    document.querySelector('[data-testid="User-Names"] a span') ||
    document.querySelector('article div[dir="auto"] span');
  return el?.textContent?.trim() || undefined;
}

function getPostedTime(): string | undefined {
  const el = document.querySelector('article time');
  return el?.getAttribute('datetime') || undefined;
}

function getCount(selector: string): number | undefined {
  const el = document.querySelector(selector);
  const text = el?.getAttribute('aria-label') || el?.textContent;
  if (!text) return undefined;
  const match = text.match(/(\d+(?:,\d+)*)/);
  return match ? Number(match[1].replace(/,/g, '')) : undefined;
}

function isThread(): boolean {
  // Look for a "Show this thread" or "Thread" indicator
  const threadIndicator =
    document.querySelector('[data-testid="tweet"] ~ [data-testid="tweet"]') ||
    document.querySelector('article + article');
  return !!threadIndicator;
}

export function extractTwitter(): ExtractedPage {
  const base = extractGeneric();

  const tweetText = getTweetText();
  const handle = getAuthorHandle();
  const authorName = getAuthorName();
  const postedAt = getPostedTime();

  base.title = tweetText || base.title;
  base.author = authorName || base.author;

  base.extras = {
    ...base.extras,
    handle,
    tweet_text: tweetText,
    posted_at: postedAt,
    likes: getCount('[data-testid="like"]'),
    retweets: getCount('[data-testid="retweet"]'),
    is_thread: isThread(),
  };

  return base;
}
