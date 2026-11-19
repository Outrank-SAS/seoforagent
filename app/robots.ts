import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

const robots = (): MetadataRoute.Robots => ({
  rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/api/', '/mcp'] }],
  sitemap: `${SITE_URL}/sitemap.xml`,
  host: SITE_URL,
});

export default robots;
