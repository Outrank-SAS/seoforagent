import { cache } from 'react';
import { OUTRANK_API_BASE } from './config';
import { pickBool, pickString } from './pick';
import { isShareToken, parseShared, type SharedLookup } from './shared';

export const fetchShared = cache(async (token: string): Promise<SharedLookup> => {
  if (!isShareToken(token)) return { status: 'not_found' };
  try {
    const response = await fetch(`${OUTRANK_API_BASE}/sfa/shared/${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'seoforagent-web' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404 || response.status === 410) return { status: 'not_found' };
    if (!response.ok) return { status: 'error' };
    const payload = (await response.json()) as unknown;
    if (pickBool(payload, ['ok']) === false) return pickString(payload, ['error.code']) === 'NOT_FOUND' ? { status: 'not_found' } : { status: 'error' };
    const result = parseShared(payload);
    return result ? { status: 'ok', result } : { status: 'error' };
  } catch {
    return { status: 'error' };
  }
});
