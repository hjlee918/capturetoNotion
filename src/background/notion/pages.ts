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

export async function createPage({
  databaseId,
  title,
  url,
}: {
  databaseId: string;
  title: string;
  url: string;
}): Promise<CreatePageResponse> {
  const schema = await notionFetch<DatabaseSchema>(`/databases/${databaseId}`);
  const titleName = findTitlePropertyName(schema.properties);
  if (!titleName) {
    throw new Error('Database has no title property');
  }

  const properties: Record<string, unknown> = {
    [titleName]: {
      title: [{ text: { content: title } }],
    },
  };

  // If the database has a URL property, use it; otherwise add the URL to the title
  for (const [name, prop] of Object.entries(schema.properties)) {
    if (prop.type === 'url') {
      properties[name] = { url };
      break;
    }
  }

  return notionFetch<CreatePageResponse>('/pages', {
    method: 'POST',
    body: {
      parent: { database_id: databaseId },
      properties,
    },
  });
}
