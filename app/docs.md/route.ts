import { docsMarkdown } from '@/lib/docs';

export const dynamic = 'force-static';

export const GET = (): Response =>
  new Response(docsMarkdown(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
