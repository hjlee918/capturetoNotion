import type { ExtractedPage } from '../../shared/types';
import { extractGeneric } from './generic';
import { extractYouTube } from './youtube';
import { extractGitHub } from './github';
import { extractTwitter } from './twitter';

const registry: Record<string, (base: ExtractedPage) => ExtractedPage> = {};

register(['youtube.com', 'youtu.be', 'm.youtube.com', 'www.youtube.com'], extractYouTube);
register(['github.com'], extractGitHub);
register(['twitter.com', 'x.com'], extractTwitter);

function getHostname(): string {
  try {
    return new URL(window.location.href).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function matchesHost(hostname: string, patterns: string[]): boolean {
  return patterns.some((p) => hostname === p || hostname.endsWith('.' + p));
}

export function register(patterns: string[], extractor: (base: ExtractedPage) => ExtractedPage): void {
  for (const pattern of patterns) {
    registry[pattern] = extractor;
  }
}

export function extractPage(): ExtractedPage {
  const base = extractGeneric();
  const hostname = getHostname();

  for (const [pattern, extractor] of Object.entries(registry)) {
    if (matchesHost(hostname, [pattern])) {
      return extractor(base);
    }
  }

  return base;
}
