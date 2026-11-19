import { clientIp } from '@/lib/backend';
import { handleMcpRequest, keyFromAuthorization, keyFromPath, mcpMethodNotAllowed } from '@/lib/mcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ key: string }> };

export const POST = async (request: Request, context: RouteContext): Promise<Response> => {
  const { key } = await context.params;
  const resolved = keyFromPath(key) ?? keyFromAuthorization(request.headers.get('authorization'));
  return handleMcpRequest(request, resolved, clientIp(request.headers));
};

export const GET = (): Response => mcpMethodNotAllowed();
export const DELETE = (): Response => mcpMethodNotAllowed();
