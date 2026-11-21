import { clientIp } from '@/lib/backend';
import { handleMcpRequest, keyFromAuthorization, mcpMethodNotAllowed } from '@/lib/mcp';
import { corsPreflight } from '@/lib/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const POST = (request: Request): Promise<Response> =>
  handleMcpRequest(request, keyFromAuthorization(request.headers.get('authorization')), clientIp(request.headers), 'chatgpt');

export const GET = (): Response => mcpMethodNotAllowed();
export const DELETE = (): Response => mcpMethodNotAllowed();
export const OPTIONS = (): Response => corsPreflight();
