import type { MetadataRoute } from 'next';
import { AGENT_PAGES } from '@/lib/agent-pages';
import { SITE_URL } from '@/lib/config';

const sitemap = (): MetadataRoute.Sitemap => {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...AGENT_PAGES.map((page) => ({ url: `${SITE_URL}/for/${page.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${SITE_URL}/vs/openseo`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];
};

export default sitemap;
