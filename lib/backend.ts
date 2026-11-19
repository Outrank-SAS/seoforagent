import { OUTRANK_API_BASE } from './config';

export interface BackendRequest {
  method: string;
  path: string;
  query?: URLSearchParams;
  body?: unknown;
  key?: string;
  idempotencyKey?: string;
  forwardedFor?: string;
  signal?: AbortSignal;
}

export interface BackendResponse {
  status: number;
  contentType: string;
  text: string;
}

export const backendUrl = (path: string, query?: URLSearchParams): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const search = query && query.toString() ? `?${query.toString()}` : '';
  return `${OUTRANK_API_BASE}${cleanPath}${search}`;
};

export const callBackend = async (request: BackendRequest): Promise<BackendResponse> => {
  const headers = new Headers({ Accept: 'application/json', 'User-Agent': 'seoforagent-web' });
  if (request.key) headers.set('Authorization', `Bearer ${request.key}`);
  if (request.idempotencyKey) headers.set('Idempotency-Key', request.idempotencyKey);
  if (request.forwardedFor) headers.set('X-Forwarded-For', request.forwardedFor);
  const hasBody = request.body !== undefined && request.method !== 'GET' && request.method !== 'DELETE';
  if (hasBody) headers.set('Content-Type', 'application/json');
  const response = await fetch(backendUrl(request.path, request.query), {
    method: request.method,
    headers,
    body: hasBody ? JSON.stringify(request.body) : undefined,
    signal: request.signal,
    cache: 'no-store',
  });
  return {
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    text: await response.text(),
  };
};

export const clientIp = (headers: Headers): string | undefined => {
  const trusted = headers.get('x-vercel-forwarded-for') || headers.get('x-real-ip');
  if (trusted) return trusted.split(',')[0]?.trim() || undefined;
  const forwarded = headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0]?.trim() || undefined : undefined;
};
