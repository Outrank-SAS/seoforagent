export interface Envelope<T = unknown> {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
  cost?: Record<string, unknown>;
  result_id?: string;
  next_actions?: unknown[];
  agent_guidance?: string;
  [key: string]: unknown;
}

export interface ApiResult<T = unknown> {
  status: number;
  envelope: Envelope<T>;
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  key?: string | null;
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

const GENERIC_MESSAGE = 'Something went wrong on our side. Try again in a moment.';
const NETWORK_MESSAGE = 'We could not reach SEOforAgent. Check your connection and try again.';

export const api = async <T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.key) headers.Authorization = `Bearer ${options.key}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') search.set(name, String(value));
  }
  const url = `/api/v1${path.startsWith('/') ? path : `/${path}`}${search.toString() ? `?${search}` : ''}`;
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      cache: 'no-store',
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === 'object' && 'ok' in (parsed as Record<string, unknown>)) {
      return { status: response.status, envelope: parsed as Envelope<T> };
    }
    if (response.ok && parsed !== null) return { status: response.status, envelope: { ok: true, data: parsed as T } };
    return {
      status: response.status,
      envelope: {
        ok: false,
        error: {
          code: response.status === 404 ? 'NOT_AVAILABLE' : 'UPSTREAM_ERROR',
          message: response.status === 404 ? 'This part of SEOforAgent is not available yet.' : GENERIC_MESSAGE,
        },
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return { status: 0, envelope: { ok: false, error: { code: 'NETWORK', message: NETWORK_MESSAGE } } };
  }
};

export const errorMessage = (envelope: Envelope): string => envelope.error?.message || GENERIC_MESSAGE;

export const dataOf = <T = Record<string, unknown>>(envelope: Envelope): T =>
  ((envelope.data ?? envelope) as unknown) as T;
