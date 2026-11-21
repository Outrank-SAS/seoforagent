import { corsPreflight, metadataResponse, protectedResourceMetadata, surfaceFromPath } from '@/lib/oauth';

export const dynamic = 'force-static';

type RouteContext = { params: Promise<{ path?: string[] }> };

export const GET = async (_request: Request, context: RouteContext): Promise<Response> => {
  const { path } = await context.params;
  const surface = surfaceFromPath(path);
  if (!surface) return Response.json({ error: 'not_found' }, { status: 404 });
  return metadataResponse(protectedResourceMetadata(surface));
};

export const OPTIONS = (): Response => corsPreflight();

export const generateStaticParams = () => [{ path: [] }, { path: ['mcp'] }, { path: ['mcp', 'chatgpt'] }, { path: ['mcp', 'claude'] }];
