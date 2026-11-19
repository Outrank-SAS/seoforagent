import { pick, pickArray, pickNumber, pickString } from './pick';

export const DEMO_COST_LABEL = '$0.03';

export type DemoErrorKind = 'invalid' | 'rate' | 'unavailable' | 'network' | 'other';

export const DEMO_ERROR_TEXT: Record<DemoErrorKind, string> = {
  invalid: 'We could not look up that domain. Check the spelling and try again.',
  rate: "You used today's 3 free lookups. Activate a key to keep going.",
  unavailable: 'The free lookup is paused right now. With a key, your agent can run it any time.',
  network: 'We could not reach SEOforAgent. Check your connection and try again.',
  other: 'The lookup failed on our side. Try again in a moment.',
};

export interface DemoKeyword {
  keyword: string;
  volume: number | undefined;
  position: number | undefined;
  path: string;
}

export interface DemoResult {
  domain: string;
  market: string;
  organicKeywords: number | undefined;
  monthlyTraffic: number | undefined;
  top3: number | undefined;
  top10: number | undefined;
  top100: number | undefined;
  topKeywords: DemoKeyword[];
  remaining: number | undefined;
}

const DOMAIN_SHAPE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,23}$/;

export const cleanDomain = (input: string): string | null => {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^[^/@]*@/, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '');
  return host.length <= 253 && DOMAIN_SHAPE.test(host) ? host : null;
};

export const demoErrorKind = (status: number, code: string | undefined): DemoErrorKind => {
  if (status === 0 || code === 'NETWORK') return 'network';
  if (status === 429 || code === 'RATE_LIMITED') return 'rate';
  if (status === 400 || status === 422 || code === 'INVALID_REQUEST') return 'invalid';
  if (status === 503 || status === 404 || code === 'DEMO_UNAVAILABLE' || code === 'NOT_AVAILABLE') return 'unavailable';
  return 'other';
};

const marketLabel = (market: unknown): string => {
  if (typeof market === 'string') return market;
  const name = pickString(market, ['name', 'label', 'country', 'location_name', 'location']);
  if (name) return name;
  const code = pickString(market, ['location_code']);
  return code ? `location ${code}` : '';
};

const pathOf = (url: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return url;
  }
};

export const parseDemoResult = (data: unknown, fallbackDomain: string): DemoResult => ({
  domain: pickString(data, ['domain'], fallbackDomain),
  market: marketLabel(pick(data, ['market'])),
  organicKeywords: pickNumber(data, ['organic_keywords']),
  monthlyTraffic: pickNumber(data, ['estimated_monthly_traffic']),
  top3: pickNumber(data, ['positions.top_3']),
  top10: pickNumber(data, ['positions.top_10']),
  top100: pickNumber(data, ['positions.top_100']),
  topKeywords: pickArray(data, ['top_keywords'])
    .slice(0, 5)
    .map((row) => ({
      keyword: pickString(row, ['keyword']),
      volume: pickNumber(row, ['volume']),
      position: pickNumber(row, ['position']),
      path: pathOf(pickString(row, ['url'])),
    }))
    .filter((row) => row.keyword),
  remaining: pickNumber(data, ['remaining_today']),
});
