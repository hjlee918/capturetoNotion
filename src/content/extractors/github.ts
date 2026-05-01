import type { ExtractedPage } from '../../shared/types';
import { extractGeneric } from './generic';

function cleanNumber(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

type GitHubPageType = 'repo' | 'file' | 'issue' | 'pr' | 'user' | 'other';

function detectPageType(pathname: string): GitHubPageType {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[1] === 'issues' && parts[2]) return 'issue';
  if (parts.length >= 2 && parts[1] === 'pull' && parts[2]) return 'pr';
  if (parts.length === 1) return 'user';
  if (parts.length >= 2) {
    const hasBlob = parts.includes('blob');
    const hasTree = parts.includes('tree');
    if (hasBlob || hasTree) return 'file';
    return 'repo';
  }
  return 'other';
}

function extractRepoExtras(): Record<string, string | number | undefined> {
  const starsEl = document.querySelector('#repo-stars-counter-star');
  const aboutEl = document.querySelector('.repository-content .BorderGrid-cell p');
  const langEl = document.querySelector('[data-testid="language-name"]');

  return {
    stars: cleanNumber(starsEl?.textContent),
    about: aboutEl?.textContent?.trim() || undefined,
    language: langEl?.textContent?.trim() || undefined,
  };
}

function extractFileExtras(): Record<string, string | number | undefined> {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const blobIndex = pathParts.indexOf('blob');
  const filePath = blobIndex >= 0 ? pathParts.slice(blobIndex + 2).join('/') : undefined;

  const langEl = document.querySelector('[data-testid="language-name"]');
  const linesEl = document.querySelector('.text-mono');

  return {
    file_path: filePath,
    language: langEl?.textContent?.trim() || undefined,
    lines: cleanNumber(linesEl?.textContent),
  };
}

function extractIssueExtras(): Record<string, string | number | undefined> {
  const titleEl = document.querySelector('.js-issue-title');
  const stateEl = document.querySelector('.State');
  const authorEl = document.querySelector('.TimelineItem-body .author');
  const numberMatch = window.location.pathname.match(/\/(issues|pull)\/(\d+)/);

  const labels: string[] = [];
  document.querySelectorAll('.js-issue-labels .IssueLabel').forEach((el) => {
    const text = el.textContent?.trim();
    if (text) labels.push(text);
  });

  return {
    title: titleEl?.textContent?.trim() || undefined,
    state: stateEl?.textContent?.trim() || undefined,
    author: authorEl?.textContent?.trim() || undefined,
    number: numberMatch ? Number(numberMatch[2]) : undefined,
    labels: labels.length > 0 ? labels.join(', ') : undefined,
  };
}

export function extractGitHub(): ExtractedPage {
  const base = extractGeneric();
  const type = detectPageType(window.location.pathname);

  base.extras = {
    ...base.extras,
    page_type: type,
  };

  switch (type) {
    case 'repo':
      Object.assign(base.extras, extractRepoExtras());
      break;
    case 'file':
      Object.assign(base.extras, extractFileExtras());
      break;
    case 'issue':
    case 'pr':
      Object.assign(base.extras, extractIssueExtras());
      break;
    default:
      break;
  }

  return base;
}
