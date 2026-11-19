import { SETUP_MD } from '@/lib/setup';

export const dynamic = 'force-static';

export const GET = (): Response =>
  new Response(SETUP_MD(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
