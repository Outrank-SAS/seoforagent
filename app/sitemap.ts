import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

const sitemap = (): MetadataRoute.Sitemap => {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];
};

export default sitemap;
