import { NextRequest } from 'next/server';
import { backendUrl, clientIp } from '@/lib/backend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FORWARDED_HEADERS = ['authorization', 'content-type', 'idempotency-key'];

type RouteContext = { params: Promise<{ path: string[] }> };

const proxy = async (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { path } = await context.params;
  const cleanPath = path.map((part) => encodeURIComponent(part)).join('/');
  const headers = new Headers({ Accept: 'application/json', 'User-Agent': 'seoforagent-web' });
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const ip = clientIp(request.headers);
  if (ip) headers.set('X-Forwarded-For', ip);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let upstream: Response;
  try {
    upstream = await fetch(backendUrl(`/${cleanPath}`, request.nextUrl.searchParams), {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: { code: 'PROVIDER_UNAVAILABLE', message: 'The SEOforAgent API could not be reached. Nothing was charged.' },
        agent_guidance: 'Retry once in a minute.',
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('Content-Type', contentType);
  for (const name of ['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'location']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
};

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
