import { describe, expect, it } from 'vitest';
import {
  GSC_CLAIM_MAX_AGE_MS,
  agentPrompts,
  bestSiteForProject,
  claimErrorMessage,
  dayLabel,
  describeChange,
  describePositionChange,
  emailsLabel,
  formatCount,
  formatCtr,
  formatPosition,
  freshStoredClaim,
  gscErrorMessage,
  linePath,
  overviewCsvRows,
  pagePath,
  parseRange,
  percentChange,
  readInsights,
  readOverview,
  readState,
  signedCount,
  siteLabel,
  storedClaimValue,
} from '@/components/dashboard/search-console';

const STATE = {
  connected: true,
  accounts: [
    { google_email: 'a@example.com', source: 'seoforagent', status: 'ok', sites: 2, connected_at: '2026-11-20T10:00:00Z' },
    { google_email: 'b@example.com', source: 'outrank', status: 'expired', sites: 1, connected_at: null },
  ],
  sites: [
    { site_url: 'sc-domain:acme.com', domain: 'acme.com', property_type: 'domain', permission: 'siteOwner', google_email: 'a@example.com', project_id: 'p1', project_name: 'Acme', usable: true },
    { site_url: 'https://acme.com/', domain: 'acme.com', property_type: 'url_prefix', permission: 'siteFullUser', google_email: 'a@example.com', project_id: 'p1', project_name: 'Acme', usable: true },
    { site_url: 'https://blog.example.org/', property_type: 'url_prefix', google_email: 'b@example.com', project_id: null, project_name: null, usable: false },
  ],
  pending: [],
  connect_page_url: 'https://seoforagent.com/app/search-console',
};

const OVERVIEW = {
  days: 28,
  period: { start: '2026-10-25', end: '2026-11-21' },
  previous: { start: '2026-09-27', end: '2026-10-24' },
  data_through: '2026-11-21',
  totals: { clicks: 1200, impressions: 50000, clicks_prev: 1000, impressions_prev: 50000 },
  sites: [
    { site_url: 'https://acme.com/', ok: true, clicks: 200, impressions: 9000, ctr: 0.022, position: 12.34, clicks_prev: 250, impressions_prev: 9000, clicks_change_pct: -20, daily: [] },
    { site_url: 'https://blog.example.org/', ok: false, error: 'Permission removed', clicks: 0, impressions: 0 },
    {
      site_url: 'sc-domain:acme.com',
      domain: 'acme.com',
      ok: true,
      clicks: 1000,
      impressions: 41000,
      ctr: 0.0244,
      position: 8.5,
      clicks_prev: 750,
      impressions_prev: 41000,
      clicks_change_pct: 33.3,
      daily: [
        { date: '2026-11-02', clicks: 40, impressions: 1200 },
        { date: '2026-11-01', clicks: 30, impressions: 1000 },
      ],
    },
  ],
  truncated: false,
};

describe('claim storage', () => {
  const now = Date.parse('2026-11-25T12:00:00Z');

  it('keeps a claim stored less than 30 minutes ago', () => {
    expect(freshStoredClaim(storedClaimValue('tok_1', now - 29 * 60 * 1000), now)).toBe('tok_1');
  });

  it('drops a claim at or after 30 minutes', () => {
    expect(freshStoredClaim(storedClaimValue('tok_1', now - GSC_CLAIM_MAX_AGE_MS), now)).toBeNull();
    expect(freshStoredClaim(storedClaimValue('tok_1', now - 2 * 60 * 60 * 1000), now)).toBeNull();
  });

  it('ignores broken, empty or future values', () => {
    expect(freshStoredClaim(null, now)).toBeNull();
    expect(freshStoredClaim('not json', now)).toBeNull();
    expect(freshStoredClaim(JSON.stringify({ claim: '', at: now }), now)).toBeNull();
    expect(freshStoredClaim(JSON.stringify({ claim: 'x' }), now)).toBeNull();
    expect(freshStoredClaim(storedClaimValue('tok_1', now + 60_000), now)).toBeNull();
  });
});

describe('messages', () => {
  it('maps every Google return error code', () => {
    expect(gscErrorMessage('access_denied')).toBe('You cancelled on Google.');
    expect(gscErrorMessage('expired')).toBe('The link expired, start again.');
    expect(gscErrorMessage('failed')).toBe('Google could not be reached, try again.');
    expect(gscErrorMessage('key_revoked')).toBe('The key that started this was revoked, start again here.');
    expect(gscErrorMessage('something_else')).toMatch(/try again/);
    expect(gscErrorMessage(null)).toBeNull();
  });

  it('explains claim errors', () => {
    expect(claimErrorMessage('NOT_FOUND', 'Not found')).toBe('This Google approval expired. Connect again.');
    expect(claimErrorMessage('FORBIDDEN', 'This approval was started from another SEOforAgent account.')).toBe('This approval was started from another SEOforAgent account.');
    expect(claimErrorMessage(undefined, undefined)).toMatch(/Connect again/);
  });

  it('never uses em dashes or exclamation marks', () => {
    const texts = [gscErrorMessage('access_denied'), gscErrorMessage('x'), claimErrorMessage('NOT_FOUND', ''), ...agentPrompts('acme.com')];
    for (const text of texts) expect(text).not.toMatch(/[—!]/);
  });
});

describe('formatting', () => {
  it('formats counts, CTR and position', () => {
    expect(formatCount(12345.4)).toBe('12,345');
    expect(formatCount(undefined)).toBe('0');
    expect(formatCtr(0.034)).toBe('3.4%');
    expect(formatCtr(undefined)).toBe('');
    expect(formatPosition(12.345)).toBe('12.3');
    expect(formatPosition(0)).toBe('');
  });

  it('computes percent change only with a positive previous value', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(undefined, 10)).toBeNull();
  });

  it('describes changes with tone and 0 or 1 decimal', () => {
    expect(describeChange(120, 100)).toMatchObject({ label: '+20%', tone: 'up' });
    expect(describeChange(95, 100)).toMatchObject({ label: '-5.0%', tone: 'down' });
    expect(describeChange(1003, 1000)).toMatchObject({ label: '+0.3%', tone: 'up' });
    expect(describeChange(100, 100)).toMatchObject({ label: 'No change', tone: 'flat' });
    expect(describeChange(10, 0)).toMatchObject({ label: 'New', tone: 'up' });
    expect(describeChange(0, 0)).toMatchObject({ tone: 'flat' });
    expect(describeChange(10, undefined)).toBeNull();
    expect(describeChange(10, undefined, 12.5)).toMatchObject({ label: '+13%', tone: 'up' });
  });

  it('treats a lower position as better', () => {
    expect(describePositionChange(8, 10)).toMatchObject({ label: 'Up 2.0', tone: 'up' });
    expect(describePositionChange(12, 10)).toMatchObject({ label: 'Down 2.0', tone: 'down' });
    expect(describePositionChange(undefined, 10)).toBeNull();
  });

  it('labels sites, dates, pages and lists', () => {
    expect(siteLabel('sc-domain:acme.com')).toBe('acme.com');
    expect(siteLabel('https://www.acme.com/')).toBe('acme.com');
    expect(siteLabel('https://acme.com/', 'given.com')).toBe('given.com');
    expect(dayLabel('2026-11-01')).toBe('Nov 1, 2026');
    expect(dayLabel('2026-11-01', false)).toBe('Nov 1');
    expect(pagePath('https://acme.com/blog/post?x=1')).toBe('/blog/post?x=1');
    expect(pagePath('https://acme.com')).toBe('/');
    expect(pagePath('javascript:alert(1)')).toBe('javascript:alert(1)');
    expect(emailsLabel(['a@x.com'])).toBe('a@x.com');
    expect(emailsLabel(['a@x.com', 'b@x.com', 'a@x.com'])).toBe('a@x.com and b@x.com');
    expect(emailsLabel(['a', 'b', 'c'])).toBe('a, b and c');
    expect(signedCount(12)).toBe('+12');
    expect(signedCount(-1234)).toBe('-1,234');
    expect(parseRange('90')).toBe(90);
    expect(parseRange('30')).toBe(28);
  });

  it('draws a line path inside the box', () => {
    expect(linePath([0, 10], 100, 24)).toBe('M2,22 L98,2');
    expect(linePath([], 100, 24)).toBe('');
    expect(linePath([0, 0], 100, 24)).toBe('M2,22 L98,22');
  });
});

describe('reading the contract', () => {
  it('reads the connection state defensively', () => {
    const state = readState(STATE);
    expect(state.connected).toBe(true);
    expect(state.accounts[1]).toMatchObject({ email: 'b@example.com', source: 'outrank', status: 'expired', sites: 1, connectedAt: '' });
    expect(state.sites[2]).toMatchObject({ domain: 'blog.example.org', propertyType: 'url_prefix', projectId: '', usable: false });
    expect(readState(undefined)).toEqual({ connected: false, accounts: [], sites: [], pending: [] });
  });

  it('maps overview rows, sorts by clicks and puts failed sites last', () => {
    const overview = readOverview(OVERVIEW, readState(STATE));
    expect(overview.rows.map((row) => row.siteUrl)).toEqual(['sc-domain:acme.com', 'https://acme.com/', 'https://blog.example.org/']);
    const top = overview.rows[0];
    expect(top).toMatchObject({ domain: 'acme.com', propertyType: 'domain', projectId: 'p1', projectName: 'Acme', clicks: 1000 });
    expect(top.clicksChange).toMatchObject({ label: '+33%', tone: 'up' });
    expect(top.impressionsChange).toMatchObject({ tone: 'flat' });
    expect(top.daily.map((point) => point.date)).toEqual(['2026-11-01', '2026-11-02']);
    expect(overview.rows[1].clicksChange).toMatchObject({ label: '-20%', tone: 'down' });
    expect(overview.rows[2]).toMatchObject({ ok: false, error: 'Permission removed' });
    expect(overview.clicksChange).toMatchObject({ label: '+20%' });
    expect(overview.dataThrough).toBe('2026-11-21');
  });

  it('builds CSV rows with plain values', () => {
    const rows = overviewCsvRows(readOverview(OVERVIEW, readState(STATE)).rows);
    expect(rows[0]).toMatchObject({ site: 'sc-domain:acme.com', clicks: 1000, ctr_percent: 2.44, position: 8.5, clicks_change: '+33%' });
    expect(rows[2]).toMatchObject({ error: 'Permission removed' });
  });

  it('finds the best property for a project', () => {
    const state = readState(STATE);
    const overview = readOverview(OVERVIEW, state);
    expect(bestSiteForProject('p1', state, overview)?.site.siteUrl).toBe('sc-domain:acme.com');
    expect(bestSiteForProject('p1', state, null)?.site.propertyType).toBe('domain');
    expect(bestSiteForProject('p2', state, overview)).toBeNull();
  });

  it('reads insights with every field missing', () => {
    const empty = readInsights({});
    expect(empty.actions).toEqual([]);
    expect(empty.pagesDown).toEqual([]);
    expect(empty.clicks).toBe(0);
    const full = readInsights({
      site_url: 'sc-domain:acme.com',
      totals: { clicks: 10, clicks_prev: 20, impressions: 100, position: 9, position_prev: 11, ctr: 0.1, ctr_prev: 0.1 },
      actions: [{ id: 'a', title: 'Refresh the pricing page', why: 'It lost 40 clicks', count: 3 }, { id: 'b' }],
      striking_distance: [{ query: 'acme pricing', page: 'https://acme.com/pricing', position: 11.2, impressions: 900, clicks: 4 }, {}],
    });
    expect(full.actions).toHaveLength(1);
    expect(full.clicksChange).toMatchObject({ label: '-50%', tone: 'down' });
    expect(full.positionChange).toMatchObject({ tone: 'up' });
    expect(full.strikingDistance).toHaveLength(1);
  });
});
