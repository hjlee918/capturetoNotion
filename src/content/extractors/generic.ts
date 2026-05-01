import type { ExtractedPage } from '../../shared/types';

function getMeta(property: string): string | undefined {
  const el =
    document.querySelector(`meta[property="${property}"]`) ||
    document.querySelector(`meta[name="${property}"]`);
  return el?.getAttribute('content') || undefined;
}

function getFavicon(): string | undefined {
  const el =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]') ||
    document.querySelector('link[rel="apple-touch-icon"]');
  const href = el?.getAttribute('href');
  if (!href) return undefined;
  try {
    return new URL(href, window.location.href).href;
  } catch {
    return undefined;
  }
}

export function extractGeneric(): ExtractedPage {
  const selection = window.getSelection()?.toString().trim() || undefined;

  return {
    title: getMeta('og:title') || document.title || 'Untitled',
    url: window.location.href,
    description: getMeta('og:description') || getMeta('description'),
    author: getMeta('og:article:author') || getMeta('author'),
    site_name: getMeta('og:site_name'),
    favicon: getFavicon(),
    image: getMeta('og:image'),
    published_time: getMeta('og:article:published_time') || getMeta('article:published_time'),
    selection: selection && selection.length > 0 ? selection : undefined,
  };
}
