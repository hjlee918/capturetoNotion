export type ExtractedPage = {
  title: string;
  url: string;
  description?: string;
  author?: string;
  site_name?: string;
  favicon?: string;
  image?: string;
  published_time?: string;
  selection?: string;
  extras?: Record<string, string | number | boolean | undefined>;
};
