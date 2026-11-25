import { pickArray, pickBool, pickNumber, pickString } from '@/lib/pick';

type Loose = Record<string, unknown>;

export const GSC_CLAIM_STORAGE = 'sfa_gsc_claim';
export const GSC_CLAIM_MAX_AGE_MS = 30 * 60 * 1000;
export const GSC_PATH = '/app/search-console';
export const GSC_RANGES = [7, 28, 90] as const;
export type GscRange = (typeof GSC_RANGES)[number];
export const DEFAULT_RANGE: GscRange = 28;

export const parseRange = (value: unknown): GscRange => {
  const number = Number(value);
  return (GSC_RANGES as readonly number[]).includes(number) ? (number as GscRange) : DEFAULT_RANGE;
};

export const storedClaimValue = (claim: string, at: number): string => JSON.stringify({ claim, at });

export const freshStoredClaim = (raw: string | null | undefined, now: number): string | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { claim?: unknown; at?: unknown };
    const claim = typeof parsed.claim === 'string' ? parsed.claim.trim() : '';
    const at = Number(parsed.at);
    if (!claim || !Number.isFinite(at)) return null;
    const age = now - at;
    return age >= 0 && age < GSC_CLAIM_MAX_AGE_MS ? claim : null;
  } catch {
    return null;
  }
};

const readLocal = (name: string): string | null => {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
};

const writeLocal = (name: string, value: string): void => {
  try {
    window.localStorage.setItem(name, value);
  } catch {
    return;
  }
};

const removeLocal = (name: string): void => {
  try {
    window.localStorage.removeItem(name);
  } catch {
    return;
  }
};

export const claimFromUrl = (): string | null => {
  try {
    if (!window.location.pathname.startsWith(GSC_PATH)) return null;
    const claim = new URLSearchParams(window.location.search).get('claim');
    return claim && claim.trim() ? claim.trim() : null;
  } catch {
    return null;
  }
};

export const stashClaim = (claim: string): void => writeLocal(GSC_CLAIM_STORAGE, storedClaimValue(claim, Date.now()));

export const stashClaimFromUrl = (): boolean => {
  const claim = claimFromUrl();
  if (claim) stashClaim(claim);
  return !!claim;
};

export const hasFreshClaim = (): boolean => {
  const raw = readLocal(GSC_CLAIM_STORAGE);
  if (!raw) return false;
  if (freshStoredClaim(raw, Date.now())) return true;
  removeLocal(GSC_CLAIM_STORAGE);
  return false;
};

export const takeClaim = (): string | null => {
  const fromUrl = claimFromUrl();
  const stored = freshStoredClaim(readLocal(GSC_CLAIM_STORAGE), Date.now());
  removeLocal(GSC_CLAIM_STORAGE);
  return fromUrl ?? stored;
};

export const GSC_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled on Google.',
  expired: 'The link expired, start again.',
  failed: 'Google could not be reached, try again.',
  key_revoked: 'The key that started this was revoked, start again here.',
};

export const gscErrorMessage = (code: string | null | undefined): string | null => {
  if (!code) return null;
  return GSC_ERROR_MESSAGES[code] ?? 'Connecting Search Console did not finish, try again.';
};

export const claimErrorMessage = (code: string | undefined, message: string | undefined): string => {
  if (code === 'NOT_FOUND') return 'This Google approval expired. Connect again.';
  if (message) return message;
  return 'We could not finish connecting Search Console. Connect again.';
};

export const formatCount = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? '0' : Math.round(value).toLocaleString('en-US');

export const formatCtr = (fraction: number | null | undefined): string => {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return '';
  const percent = fraction * 100;
  return `${percent.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

export const formatPosition = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) || value <= 0 ? '' : value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const percentChange = (current: number | null | undefined, previous: number | null | undefined): number | null => {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
};

export type ChangeTone = 'up' | 'down' | 'flat';
export interface Change {
  label: string;
  tone: ChangeTone;
  spoken: string;
}

const NO_CHANGE: Change = { label: 'No change', tone: 'flat', spoken: 'no change from the previous period' };

export const describeChange = (current: number | null | undefined, previous: number | null | undefined, givenPct?: number | null): Change | null => {
  const computed = percentChange(current, previous);
  const pct = computed ?? (typeof givenPct === 'number' && Number.isFinite(givenPct) ? givenPct : null);
  if (pct === null) {
    if (previous !== 0 || current === null || current === undefined) return null;
    return current > 0 ? { label: 'New', tone: 'up', spoken: 'none in the previous period' } : NO_CHANGE;
  }
  const size = Math.abs(pct);
  if (size < 0.05) return NO_CHANGE;
  const digits = size < 10 ? 1 : 0;
  const text = `${size.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
  return pct > 0
    ? { label: `+${text}`, tone: 'up', spoken: `up ${text} from the previous period` }
    : { label: `-${text}`, tone: 'down', spoken: `down ${text} from the previous period` };
};

export const describePositionChange = (current: number | null | undefined, previous: number | null | undefined): Change | null => {
  if (!current || !previous || !Number.isFinite(current) || !Number.isFinite(previous)) return null;
  const delta = previous - current;
  if (Math.abs(delta) < 0.1) return NO_CHANGE;
  const text = Math.abs(delta).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return delta > 0 ? { label: `Up ${text}`, tone: 'up', spoken: `${text} places better than before` } : { label: `Down ${text}`, tone: 'down', spoken: `${text} places worse than before` };
};

export const CHANGE_CLASS: Record<ChangeTone, string> = { up: 'text-ok', down: 'text-danger', flat: 'text-muted' };

export const siteLabel = (siteUrl: string, domain?: string): string => {
  if (domain) return domain;
  if (siteUrl.startsWith('sc-domain:')) return siteUrl.slice('sc-domain:'.length);
  return siteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
};

export const propertyTypeOf = (siteUrl: string, given?: string): 'domain' | 'url_prefix' =>
  given === 'domain' || given === 'url_prefix' ? given : siteUrl.startsWith('sc-domain:') ? 'domain' : 'url_prefix';

export const propertyTypeLabel = (type: 'domain' | 'url_prefix'): string => (type === 'domain' ? 'Domain property' : 'URL prefix');

export interface GscAccount {
  email: string;
  source: 'seoforagent' | 'outrank';
  status: 'ok' | 'expired' | 'error';
  sites: number;
  connectedAt: string;
}

export interface GscSite {
  siteUrl: string;
  domain: string;
  propertyType: 'domain' | 'url_prefix';
  permission: string;
  email: string;
  projectId: string;
  projectName: string;
  usable: boolean;
}

export interface GscState {
  connected: boolean;
  accounts: GscAccount[];
  sites: GscSite[];
  pending: { email: string; expiresAt: string }[];
}

export const readState = (data: unknown): GscState => {
  const accounts = pickArray(data, ['accounts']).map((row) => {
    const source = pickString(row, ['source']);
    const status = pickString(row, ['status']);
    return {
      email: pickString(row, ['google_email', 'email']),
      source: source === 'outrank' ? 'outrank' : 'seoforagent',
      status: status === 'expired' || status === 'error' ? status : 'ok',
      sites: pickNumber(row, ['sites']) ?? 0,
      connectedAt: pickString(row, ['connected_at']),
    } satisfies GscAccount;
  });
  const sites = pickArray(data, ['sites']).map((row) => {
    const siteUrl = pickString(row, ['site_url']);
    return {
      siteUrl,
      domain: siteLabel(siteUrl, pickString(row, ['domain'])),
      propertyType: propertyTypeOf(siteUrl, pickString(row, ['property_type'])),
      permission: pickString(row, ['permission']),
      email: pickString(row, ['google_email']),
      projectId: pickString(row, ['project_id']),
      projectName: pickString(row, ['project_name']),
      usable: pickBool(row, ['usable']) ?? true,
    } satisfies GscSite;
  });
  const pending = pickArray(data, ['pending']).map((row) => ({ email: pickString(row, ['google_email', 'email']), expiresAt: pickString(row, ['expires_at']) }));
  return { connected: pickBool(data, ['connected']) ?? (accounts.length > 0 && sites.length > 0), accounts, sites, pending };
};

export interface DailyPoint {
  date: string;
  clicks: number;
  impressions: number;
}

export const readDaily = (rows: Loose[]): DailyPoint[] =>
  rows
    .map((row) => ({ date: pickString(row, ['date']), clicks: pickNumber(row, ['clicks']) ?? 0, impressions: pickNumber(row, ['impressions']) ?? 0 }))
    .filter((row) => row.date)
    .sort((a, b) => a.date.localeCompare(b.date));

export interface OverviewRow {
  siteUrl: string;
  domain: string;
  propertyType: 'domain' | 'url_prefix';
  projectId: string;
  projectName: string;
  email: string;
  ok: boolean;
  error: string;
  clicks: number;
  impressions: number;
  ctr: number | undefined;
  position: number | undefined;
  clicksPrev: number | undefined;
  impressionsPrev: number | undefined;
  clicksChange: Change | null;
  impressionsChange: Change | null;
  daily: DailyPoint[];
}

export interface Overview {
  days: number;
  start: string;
  end: string;
  dataThrough: string;
  clicks: number;
  impressions: number;
  clicksChange: Change | null;
  impressionsChange: Change | null;
  rows: OverviewRow[];
  truncated: boolean;
}

export const readOverview = (data: unknown, state?: GscState): Overview => {
  const bySite = new Map((state?.sites ?? []).map((site) => [site.siteUrl, site]));
  const rows = pickArray(data, ['sites']).map((row) => {
    const siteUrl = pickString(row, ['site_url']);
    const known = bySite.get(siteUrl);
    const clicks = pickNumber(row, ['clicks']) ?? 0;
    const impressions = pickNumber(row, ['impressions']) ?? 0;
    const clicksPrev = pickNumber(row, ['clicks_prev']);
    const impressionsPrev = pickNumber(row, ['impressions_prev']);
    const projectId = pickString(row, ['project_id']) || known?.projectId || '';
    return {
      siteUrl,
      domain: siteLabel(siteUrl, pickString(row, ['domain']) || known?.domain),
      propertyType: propertyTypeOf(siteUrl, known?.propertyType),
      projectId,
      projectName: known?.projectName ?? '',
      email: pickString(row, ['google_email']) || known?.email || '',
      ok: pickBool(row, ['ok']) ?? true,
      error: pickString(row, ['error']),
      clicks,
      impressions,
      ctr: pickNumber(row, ['ctr']),
      position: pickNumber(row, ['position']),
      clicksPrev,
      impressionsPrev,
      clicksChange: describeChange(clicks, clicksPrev, pickNumber(row, ['clicks_change_pct']) ?? null),
      impressionsChange: describeChange(impressions, impressionsPrev, pickNumber(row, ['impressions_change_pct']) ?? null),
      daily: readDaily(pickArray(row, ['daily'])),
    } satisfies OverviewRow;
  });
  rows.sort((a, b) => Number(b.ok) - Number(a.ok) || b.clicks - a.clicks || b.impressions - a.impressions);
  const clicks = pickNumber(data, ['totals.clicks']) ?? rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = pickNumber(data, ['totals.impressions']) ?? rows.reduce((sum, row) => sum + row.impressions, 0);
  return {
    days: pickNumber(data, ['days']) ?? DEFAULT_RANGE,
    start: pickString(data, ['period.start']),
    end: pickString(data, ['period.end']),
    dataThrough: pickString(data, ['data_through']),
    clicks,
    impressions,
    clicksChange: describeChange(clicks, pickNumber(data, ['totals.clicks_prev'])),
    impressionsChange: describeChange(impressions, pickNumber(data, ['totals.impressions_prev'])),
    rows,
    truncated: pickBool(data, ['truncated']) ?? false,
  };
};

export const overviewCsvRows = (rows: OverviewRow[]): Record<string, unknown>[] =>
  rows.map((row) => ({
    site: row.siteUrl,
    domain: row.domain,
    property_type: row.propertyType,
    clicks: row.clicks,
    clicks_previous: row.clicksPrev ?? '',
    clicks_change: row.clicksChange?.label ?? '',
    impressions: row.impressions,
    impressions_previous: row.impressionsPrev ?? '',
    impressions_change: row.impressionsChange?.label ?? '',
    ctr_percent: row.ctr !== undefined ? Number((row.ctr * 100).toFixed(2)) : '',
    position: row.position !== undefined ? Number(row.position.toFixed(1)) : '',
    project_id: row.projectId,
    google_email: row.email,
    error: row.ok ? '' : row.error,
  }));

export const bestSiteForProject = (projectId: string, state: GscState, overview: Overview | null): { site: GscSite; row: OverviewRow | null } | null => {
  const matches = state.sites.filter((site) => site.projectId && site.projectId === projectId);
  if (matches.length === 0) return null;
  const withRows = matches.map((site) => ({ site, row: overview?.rows.find((row) => row.siteUrl === site.siteUrl) ?? null }));
  withRows.sort(
    (a, b) =>
      Number(b.row?.ok ?? false) - Number(a.row?.ok ?? false) ||
      (b.row?.clicks ?? -1) - (a.row?.clicks ?? -1) ||
      Number(b.site.propertyType === 'domain') - Number(a.site.propertyType === 'domain'),
  );
  return withRows[0];
};

export const emailsLabel = (emails: string[]): string => {
  const unique = [...new Set(emails.filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? '';
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
};

export const plural = (count: number, one: string, many: string): string => `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

export const linePath = (values: number[], width: number, height: number, pad = 2): string => {
  if (values.length === 0) return '';
  const max = Math.max(...values);
  const usable = height - pad * 2;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const x = pad + index * step;
      const y = max > 0 ? pad + usable - (value / max) * usable : pad + usable;
      return `${index === 0 ? 'M' : 'L'}${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(' ');
};

export const agentPrompts = (firstDomain: string): string[] => {
  const domain = firstDomain || 'my site';
  return [
    'Show me my Search Console overview for all my sites and what changed this month.',
    `Which pages lost the most clicks on ${domain} in the last 28 days, and why?`,
    `Find queries where ${domain} ranks 8 to 20 and tell me what to change on each page.`,
  ];
};

export const pagePath = (page: string): string => {
  const match = /^https?:\/\/[^/]+(.*)$/i.exec(page);
  if (!match) return page;
  return match[1] || '/';
};

export interface InsightAction {
  id: string;
  title: string;
  why: string;
  count: number | undefined;
}

export interface InsightRow {
  query: string;
  page: string;
  clicks: number | undefined;
  clicksPrev: number | undefined;
  clicksChange: number | undefined;
  impressions: number | undefined;
  position: number | undefined;
  ctr: number | undefined;
  expectedCtr: number | undefined;
}

export interface Insights {
  siteUrl: string;
  start: string;
  end: string;
  dataThrough: string;
  clicks: number;
  impressions: number;
  ctr: number | undefined;
  position: number | undefined;
  clicksChange: Change | null;
  impressionsChange: Change | null;
  ctrChange: Change | null;
  positionChange: Change | null;
  daily: DailyPoint[];
  actions: InsightAction[];
  pagesUp: InsightRow[];
  pagesDown: InsightRow[];
  queriesUp: InsightRow[];
  queriesDown: InsightRow[];
  strikingDistance: InsightRow[];
  lowCtr: InsightRow[];
  newQueries: InsightRow[];
  lostQueries: InsightRow[];
}

const readInsightRows = (data: unknown, path: string): InsightRow[] =>
  pickArray(data, [path])
    .map((row) => ({
      query: pickString(row, ['query']),
      page: pickString(row, ['page']),
      clicks: pickNumber(row, ['clicks']),
      clicksPrev: pickNumber(row, ['clicks_prev']),
      clicksChange: pickNumber(row, ['clicks_change']),
      impressions: pickNumber(row, ['impressions']),
      position: pickNumber(row, ['position']),
      ctr: pickNumber(row, ['ctr']),
      expectedCtr: pickNumber(row, ['expected_ctr']),
    }))
    .filter((row) => row.query || row.page);

export const readInsights = (data: unknown): Insights => {
  const clicks = pickNumber(data, ['totals.clicks']) ?? 0;
  const impressions = pickNumber(data, ['totals.impressions']) ?? 0;
  const ctr = pickNumber(data, ['totals.ctr']);
  const ctrPrev = pickNumber(data, ['totals.ctr_prev']);
  const position = pickNumber(data, ['totals.position']);
  return {
    siteUrl: pickString(data, ['site_url']),
    start: pickString(data, ['period.start']),
    end: pickString(data, ['period.end']),
    dataThrough: pickString(data, ['data_through']),
    clicks,
    impressions,
    ctr,
    position,
    clicksChange: describeChange(clicks, pickNumber(data, ['totals.clicks_prev'])),
    impressionsChange: describeChange(impressions, pickNumber(data, ['totals.impressions_prev'])),
    ctrChange: describeChange(ctr, ctrPrev),
    positionChange: describePositionChange(position, pickNumber(data, ['totals.position_prev'])),
    daily: readDaily(pickArray(data, ['daily'])),
    actions: pickArray(data, ['actions'])
      .map((row, index) => ({ id: pickString(row, ['id'], String(index)), title: pickString(row, ['title']), why: pickString(row, ['why']), count: pickNumber(row, ['count']) }))
      .filter((row) => row.title),
    pagesUp: readInsightRows(data, 'pages_up'),
    pagesDown: readInsightRows(data, 'pages_down'),
    queriesUp: readInsightRows(data, 'queries_up'),
    queriesDown: readInsightRows(data, 'queries_down'),
    strikingDistance: readInsightRows(data, 'striking_distance'),
    lowCtr: readInsightRows(data, 'low_ctr'),
    newQueries: readInsightRows(data, 'new_queries'),
    lostQueries: readInsightRows(data, 'lost_queries'),
  };
};

export const signedCount = (value: number | undefined): string => {
  if (value === undefined || !Number.isFinite(value)) return '';
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '-'}${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dayLabel = (value: string, withYear = true): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return value;
  const day = Number(match[3]);
  return withYear ? `${month} ${day}, ${match[1]}` : `${month} ${day}`;
};
