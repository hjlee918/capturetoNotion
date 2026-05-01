import type { ExtractedPage } from '../../shared/types';
import { notionFetch } from './client';

type DatabaseSchema = {
  id: string;
  properties: Record<
    string,
    { id: string; name: string; type: string }
  >;
};

type CreatePageResponse = {
  id: string;
  url: string;
};

function findTitlePropertyName(properties: DatabaseSchema['properties']): string | null {
  for (const [name, prop] of Object.entries(properties)) {
    if (prop.type === 'title') {
      return name;
    }
  }
  return null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function exactMatch(name: string, candidates: string[]): boolean {
  const n = normalize(name);
  return candidates.some((c) => normalize(c) === n);
}

export async function createPage({
  databaseId,
  extracted,
}: {
  databaseId: string;
  extracted: ExtractedPage;
}): Promise<CreatePageResponse> {
  const schema = await notionFetch<DatabaseSchema>(`/databases/${databaseId}`);
  const titleName = findTitlePropertyName(schema.properties);
  if (!titleName) {
    throw new Error('Database has no title property');
  }

  const properties: Record<string, unknown> = {
    [titleName]: {
      title: [{ text: { content: extracted.title } }],
    },
  };

  for (const [name, prop] of Object.entries(schema.properties)) {
    if (prop.type === 'url') {
      properties[name] = { url: extracted.url };
      continue;
    }

    if (prop.type === 'rich_text') {
      if (exactMatch(name, ['Description', 'Summary', 'Notes']) && extracted.description) {
        properties[name] = {
          rich_text: [{ text: { content: extracted.description } }],
        };
        continue;
      }
      if (exactMatch(name, ['Author']) && extracted.author) {
        properties[name] = {
          rich_text: [{ text: { content: extracted.author } }],
        };
        continue;
      }
      if (exactMatch(name, ['Source', 'Site']) && extracted.site_name) {
        properties[name] = {
          rich_text: [{ text: { content: extracted.site_name } }],
        };
        continue;
      }
    }

    if (prop.type === 'files') {
      if (exactMatch(name, ['Image', 'Cover']) && extracted.image) {
        properties[name] = {
          files: [
            { type: 'external', name: 'Image', external: { url: extracted.image } },
          ],
        };
        continue;
      }
    }

    if (prop.type === 'date') {
      if (exactMatch(name, ['Published', 'Date']) && extracted.published_time) {
        properties[name] = { date: { start: extracted.published_time } };
        continue;
      }
    }
  }

  const body: Record<string, unknown> = {
    parent: { database_id: databaseId },
    properties,
  };

  if (extracted.image) {
    body.cover = { type: 'external', external: { url: extracted.image } };
  }

  if (extracted.favicon) {
    body.icon = { type: 'external', external: { url: extracted.favicon } };
  }

  if (extracted.selection && extracted.selection.length > 0) {
    body.children = [
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ type: 'text', text: { content: extracted.selection } }],
        },
      },
    ];
  }

  return notionFetch<CreatePageResponse>('/pages', {
    method: 'POST',
    body,
  });
}
