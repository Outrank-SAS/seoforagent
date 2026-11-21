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
  surface?: string;
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

export const CLIENT_IP_HEADER = 'x-sfa-client-ip';
export const PROXY_SECRET_HEADER = 'x-sfa-proxy-secret';
export const SURFACE_HEADER = 'x-sfa-surface';

export const setVisitorHeaders = (headers: Headers, ip: string | undefined): void => {
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);
  if (ip) headers.set(CLIENT_IP_HEADER, ip);
  const secret = process.env.SFA_PROXY_SECRET;
  if (secret) headers.set(PROXY_SECRET_HEADER, secret);
};

export const callBackend = async (request: BackendRequest): Promise<BackendResponse> => {
  const headers = new Headers({ Accept: 'application/json', 'User-Agent': 'seoforagent-web' });
  if (request.key) headers.set('Authorization', `Bearer ${request.key}`);
  if (request.idempotencyKey) headers.set('Idempotency-Key', request.idempotencyKey);
  if (request.forwardedFor) headers.set('X-Forwarded-For', request.forwardedFor);
  setVisitorHeaders(headers, request.forwardedFor);
  if (request.surface) headers.set(SURFACE_HEADER, request.surface);
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

export const forwardRaw = async (request: {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: ArrayBuffer;
  forwardedFor?: string;
}): Promise<{ status: number; contentType: string; body: ArrayBuffer }> => {
  const headers = new Headers({ Accept: 'application/json', 'User-Agent': 'seoforagent-web', ...request.headers });
  if (request.forwardedFor) headers.set('X-Forwarded-For', request.forwardedFor);
  setVisitorHeaders(headers, request.forwardedFor);
  const response = await fetch(backendUrl(request.path), {
    method: request.method,
    headers,
    body: request.body,
    cache: 'no-store',
    redirect: 'manual',
  });
  return {
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    body: await response.arrayBuffer(),
  };
};
