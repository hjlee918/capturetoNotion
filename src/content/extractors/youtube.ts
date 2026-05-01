import type { ExtractedPage } from '../../shared/types';
import { extractGeneric } from './generic';

function parseDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getChannelName(): string | undefined {
  const el =
    document.querySelector('[itemprop="author"] [itemprop="name"]') ||
    document.querySelector('ytd-channel-name a') ||
    document.querySelector('#above-the-fold #text a');
  return el?.textContent?.trim() || undefined;
}

function getVideoDuration(): string | undefined {
  const video = document.querySelector('video');
  if (video && Number.isFinite(video.duration)) {
    return parseDuration(video.duration);
  }
  const badge = document.querySelector('.ytp-time-duration');
  if (badge) {
    return badge.textContent?.trim() || undefined;
  }
  return undefined;
}

function getPublishedDate(): string | undefined {
  const el = document.querySelector('[itemprop="datePublished"]');
  return el?.getAttribute('content') || undefined;
}

function getThumbnail(videoId: string): string | undefined {
  const maxres = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  // We can't synchronously check if maxres exists, so return it and let Notion handle fallbacks
  return maxres;
}

function extractVideoId(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    return u.searchParams.get('v') || undefined;
  } catch {
    return undefined;
  }
}

export function extractYouTube(): ExtractedPage {
  const base = extractGeneric();

  // Clean up title suffix
  if (base.title?.endsWith(' - YouTube')) {
    base.title = base.title.slice(0, -' - YouTube'.length).trim();
  }

  const videoId = extractVideoId(base.url);

  const channel = getChannelName();
  const duration = getVideoDuration();
  const published = getPublishedDate();

  base.author = channel || base.author;
  base.published_time = published || base.published_time;
  base.image = videoId ? getThumbnail(videoId) : base.image;

  base.extras = {
    ...base.extras,
    channel,
    duration,
  };

  return base;
}
