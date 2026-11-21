import { clientIp } from '@/lib/backend';
import { corsPreflight, forwardOAuth } from '@/lib/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = (request: Request): Promise<Response> => forwardOAuth(request, '/sfa/oauth/revoke', clientIp(request.headers));

export const OPTIONS = (): Response => corsPreflight();
