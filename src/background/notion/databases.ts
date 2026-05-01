import { notionFetch } from './client';

export type NotionDatabase = {
  id: string;
  title: { plain_text: string }[];
  url?: string;
};

type SearchResponse = {
  results: Array<{ object: string; id: string; title?: { plain_text: string }[]; url?: string }>;
  has_more: boolean;
};

export async function listDatabases(): Promise<NotionDatabase[]> {
  const data = await notionFetch<SearchResponse>('/search', {
    method: 'POST',
    body: {
      filter: { value: 'database', property: 'object' },
    },
  });

  return data.results
    .filter((r) => r.object === 'database')
    .map((r) => ({
      id: r.id,
      title: r.title ?? [],
      url: r.url,
    }));
}
