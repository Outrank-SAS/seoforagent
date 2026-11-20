import { afterEach, describe, expect, it } from 'vitest';
import { safeProps } from '@/lib/analytics';
import { AGENT_PAGES } from '@/lib/agent-pages';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER, clientIp, setVisitorHeaders } from '@/lib/backend';
import { cleanDomain, demoErrorKind, parseDemoResult } from '@/lib/demo';
import { formatStars } from '@/lib/github';
import { agentById } from '@/lib/setup';
import { isShareToken, parseDiagnosis, parseShared, safeHttpUrl, sharedHeadline, sharedSubject } from '@/lib/shared';
import { REWARDFUL_QUEUE, posthogInit } from '@/lib/snippets';
import { TOOL_BY_NAME } from '@/lib/tools';

describe('analytics properties', () => {
  it('tags every event with the surface', () => {
    expect(safeProps()).toEqual({ surface: 'sfa' });
    expect(safeProps({ kind: 'plan', plan: 'growth', amount_usd: 49 })).toEqual({ kind: 'plan', plan: 'growth', amount_usd: 49, surface: 'sfa' });
  });

  it('never lets a key or an email through', () => {
    const key = `sfa_live_${'a'.repeat(43)}`;
    expect(safeProps({ key, api_key: 'x', email: 'a@b.co', note: `saw ${key}`, who: 'tibo@example.com', agent: 'cursor', empty: undefined })).toEqual({
      agent: 'cursor',
      surface: 'sfa',
    });
    expect(safeProps({ surface: 'other' })).toEqual({ surface: 'sfa' });
  });
});

describe('visitor headers', () => {
  afterEach(() => {
    delete process.env.SFA_PROXY_SECRET;
  });

  it('reads the visitor IP in the trusted order', () => {
    expect(clientIp(new Headers({ 'x-vercel-forwarded-for': '1.1.1.1, 9.9.9.9', 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3' }))).toBe('1.1.1.1');
    expect(clientIp(new Headers({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3' }))).toBe('2.2.2.2');
    expect(clientIp(new Headers({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }))).toBe('3.3.3.3');
    expect(clientIp(new Headers())).toBeUndefined();
  });

  it('replaces anything the browser sent', () => {
    process.env.SFA_PROXY_SECRET = 'server-secret';
    const headers = new Headers({ [CLIENT_IP_HEADER]: '6.6.6.6', [PROXY_SECRET_HEADER]: 'guess' });
    setVisitorHeaders(headers, '1.1.1.1');
    expect(headers.get(CLIENT_IP_HEADER)).toBe('1.1.1.1');
    expect(headers.get(PROXY_SECRET_HEADER)).toBe('server-secret');
  });

  it('sends no secret when none is configured and no IP when none is known', () => {
    const headers = new Headers({ [CLIENT_IP_HEADER]: '6.6.6.6', [PROXY_SECRET_HEADER]: 'guess' });
    setVisitorHeaders(headers, undefined);
    expect(headers.has(CLIENT_IP_HEADER)).toBe(false);
    expect(headers.has(PROXY_SECRET_HEADER)).toBe(false);
  });
});

describe('domain demo', () => {
  it('cleans what people paste', () => {
    expect(cleanDomain('  https://www.Example.com/pricing?x=1 ')).toBe('example.com');
    expect(cleanDomain('blog.example.co.uk')).toBe('blog.example.co.uk');
    expect(cleanDomain('example.com:8080/a')).toBe('example.com');
    expect(cleanDomain('example.com.')).toBe('example.com');
  });

  it('rejects what is not a domain', () => {
    for (const value of ['', 'hello', 'http://', 'exa mple.com', 'example', '-bad.com', 'a@b', 'javascript:alert(1)']) expect(cleanDomain(value)).toBeNull();
  });

  it('maps each failure to its message', () => {
    expect(demoErrorKind(429, 'RATE_LIMITED')).toBe('rate');
    expect(demoErrorKind(400, 'INVALID_REQUEST')).toBe('invalid');
    expect(demoErrorKind(503, 'DEMO_UNAVAILABLE')).toBe('unavailable');
    expect(demoErrorKind(404, 'NOT_AVAILABLE')).toBe('unavailable');
    expect(demoErrorKind(0, 'NETWORK')).toBe('network');
    expect(demoErrorKind(500, 'INTERNAL')).toBe('other');
    expect(demoErrorKind(502, 'PROVIDER_UNAVAILABLE')).toBe('other');
  });

  it('reads the contract shape and survives missing fields', () => {
    const result = parseDemoResult(
      {
        domain: 'example.com',
        market: 'United States',
        organic_keywords: 1240,
        estimated_monthly_traffic: 8300,
        positions: { top_3: 12, top_10: 48, top_100: 610 },
        top_keywords: [{ keyword: 'example domain', volume: 9900, position: 1, url: 'https://example.com/docs?a=1' }, { volume: 3 }],
        remaining_today: 2,
      },
      'fallback.com',
    );
    expect(result).toMatchObject({ domain: 'example.com', market: 'United States', organicKeywords: 1240, monthlyTraffic: 8300, top3: 12, top10: 48, top100: 610, remaining: 2 });
    expect(result.topKeywords).toEqual([{ keyword: 'example domain', volume: 9900, position: 1, path: '/docs?a=1' }]);
    const empty = parseDemoResult({}, 'fallback.com');
    expect(empty.domain).toBe('fallback.com');
    expect(empty.topKeywords).toEqual([]);
    expect(parseDemoResult({ market: { location_code: 2840 } }, 'a.com').market).toBe('location 2840');
  });
});

describe('shared results', () => {
  const ai = {
    ok: true,
    data: {
      tool: 'ai_visibility_check',
      title: 'AI visibility for Acme',
      created_at: '2026-11-19T10:00:00Z',
      domain: 'acme.com',
      data: {
        brand: 'Acme',
        prompts: ['best crm'],
        summary: {
          answers: 4,
          mentioned: 1,
          cited: 0,
          by_engine: [
            { engine: 'claude', answers: 1, mentioned: 0, cited: 0 },
            { engine: 'chatgpt', answers: 1, mentioned: 1, cited: 0 },
          ],
          top_sources: [{ domain: 'g2.com', answers: 3 }],
        },
        answers: [{ prompt: 'best crm', engine: 'chatgpt', mentioned: true, cited: false, competitors_named: ['HubSpot'] }],
      },
    },
  };

  it('parses an AI visibility result and orders the assistants', () => {
    const result = parseShared(ai)!;
    expect(result.tool).toBe('ai_visibility_check');
    expect(result.ai?.byEngine.map((row) => row.engine)).toEqual(['chatgpt', 'claude']);
    expect(result.ai?.rows[0].competitors).toEqual(['HubSpot']);
    expect(sharedHeadline(result)).toBe('Mentioned in 1 of 4 AI answers');
  });

  it('parses a listicle result and caps the table at 20 pages', () => {
    const pages = Array.from({ length: 30 }, (_, index) => ({
      domain: `site${index}.com`,
      url: `https://site${index}.com/best`,
      title: `Best ${index}`,
      type: 'listicle',
      google: [{ query: 'best crm', position: index + 1 }],
      cited_by: ['chatgpt'],
      domain_rating: 50,
      lists_you: false,
      worth_paying: index < 3,
      score: 90 - index,
    }));
    const result = parseShared({ ok: true, data: { tool: 'listicles_find', title: '', created_at: '', domain: 'acme.com', data: { queries: ['best crm'], pages_found: 78, worth_paying: 3, pages } } })!;
    expect(result.listicles?.pages).toHaveLength(20);
    expect(sharedHeadline(result)).toBe('78 lists rank or get cited for these queries, 3 worth being on');
  });

  it('parses a shared diagnosis', () => {
    const result = parseShared({
      ok: true,
      data: {
        tool: 'ai_visibility_diagnose',
        title: 'Why AI assistants leave out Acme',
        created_at: '2026-11-20T08:49:43Z',
        domain: 'acme.com',
        data: {
          brand: 'Acme',
          verdict: 'Acme is left out of 16 of 20 answers.',
          score: { answers: 20, mentioned: 4, cited: 5, missed: 16, prompts: 5, engines: ['claude', 'chatgpt'] },
          reasons: [
            { id: 'not_on_cited_pages', severity: 'high', title: 'The pages the assistants read do not mention you', evidence: 'None of 34 pages mention Acme.' },
            { id: 'other', severity: 'urgent', title: 'Something else', evidence: '' },
          ],
          actions: [
            {
              id: 'publish_answer_pages',
              rank: 1,
              title: 'Publish a page that answers each question',
              why: 'Assistants cite pages.',
              steps: ['Write one page per question.', 7, ''],
              effort: '1 to 2 hours per page',
              cost: 'Free if you write them',
              expect: 'Days to weeks.',
              outrank: { product: 'Outrank', what: 'Writes articles.', price: '$99 a month', why_relevant: 'Covers the variants.', limits: null, tool: null, url: 'https://www.outrank.so/?utm_source=seoforagent' },
            },
            { id: 'build_authority', rank: 2, title: 'Raise the authority of your site', why: '', steps: [], outrank: { product: 'Backlinks', what: 'Places links.', price: 'DR x 2', why_relevant: '', limits: 'No promise.', url: 'http://www.outrank.so/' } },
            { id: 'track', rank: 3, title: 'Check again in 2 to 4 weeks', steps: ['Run the check again.'], outrank: null },
          ],
          who_wins: [{ name: 'Smash', domain: null, answers: 6, own_site_cited: 2 }],
          cited_pages: { total: 129, outside_your_site: 125, third_party_read: 34, mention_you: 0 },
          pages_to_get_on: [
            { url: 'https://suresend.ca/alternatives', domain: 'suresend.ca', type: 'listicle', how: 'pitch', cited_in_answers: 2, engines: ['gemini', 'chatgpt'], names: ['Smash', 'Filemail'], title: 'WeTransfer Alternatives' },
            { domain: 'nourl.com', type: 'forum', how: 'join' },
          ],
          prompts: [
            {
              prompt: 'best WeTransfer alternative',
              mentioned_on: [],
              missing_on: ['claude', 'perplexity'],
              recommended: ['Smash'],
              drafted: { rewarded: 'Large free limits.', page_title: 'Best WeTransfer Alternatives', page_type: 'best_list', page_type_label: 'a "best of" list', page_angle: 'Compare on limits.' },
            },
            { prompt: 'how to track opens', mentioned_on: ['claude'], missing_on: [], recommended: [], drafted: null },
          ],
          limits: ['Answers vary between runs.'],
        },
      },
    })!;
    const diagnosis = result.diagnosis!;
    expect(result.tool).toBe('ai_visibility_diagnose');
    expect(result.ai).toBeNull();
    expect(sharedHeadline(result)).toBe('Left out of 16 of 20 AI answers');
    expect(sharedSubject(result)).toBe('Acme');
    expect(diagnosis.score.engines).toEqual(['chatgpt', 'claude']);
    expect(diagnosis.reasons.map((reason) => reason.severity)).toEqual(['high', 'low']);
    expect(diagnosis.actions.map((action) => action.id)).toEqual(['publish_answer_pages', 'build_authority', 'track']);
    expect(diagnosis.actions[0].steps).toEqual(['Write one page per question.']);
    expect(diagnosis.actions[0].outrank).toEqual({
      product: 'Outrank',
      what: 'Writes articles.',
      price: '$99 a month',
      whyRelevant: 'Covers the variants.',
      limits: '',
      url: 'https://www.outrank.so/?utm_source=seoforagent',
    });
    expect(diagnosis.actions[1].outrank?.url).toBeNull();
    expect(diagnosis.actions[2].outrank).toBeNull();
    expect(diagnosis.actions[0].tools).toEqual([]);
    expect(diagnosis.whoWins).toEqual([{ name: 'Smash', domain: '', answers: 6, ownSiteCited: 2 }]);
    expect(diagnosis.citedPages).toEqual({ outsideYourSite: 125, thirdPartyRead: 34, mentionYou: 0 });
    expect(diagnosis.pages).toHaveLength(1);
    expect(diagnosis.pages[0]).toMatchObject({ title: 'WeTransfer Alternatives', how: 'pitch', citedInAnswers: 2, engines: ['chatgpt', 'gemini'], names: ['Smash', 'Filemail'] });
    expect(diagnosis.prompts[0].missingOn).toEqual(['perplexity', 'claude']);
    expect(diagnosis.prompts[0].google).toBeNull();
    expect(diagnosis.prompts[0].drafted?.pageTypeLabel).toBe('a "best of" list');
    expect(diagnosis.prompts[1].drafted).toBeNull();
    expect(diagnosis.limits).toEqual(['Answers vary between runs.']);
  });

  it('reads the dashboard diagnosis shape and survives missing fields', () => {
    const diagnosis = parseDiagnosis({
      brand: 'Acme',
      score: { answers: 8, mentioned: 3 },
      actions: [
        {
          id: 'get_on_cited_pages',
          title: 'Get listed on the pages the assistants cite',
          tools: [{ kind: 'tool', tool: 'listicles_find', args: { queries: ['best crm'] }, why: 'Save the lists', est_cost_usd: 1.5 }, { kind: 'tool' }],
        },
        { id: 'untitled' },
      ],
      pages_to_get_on: [{ url: 'https://a.com/best', untrusted_text: { title: '<b>Best</b> tools' }, how: 'PROFILE' }],
      prompts: [
        { prompt: 'best crm', google_top_20: true, google_position: 10 },
        { prompt: 'crm for agencies', google_top_20: false, google_position: null },
      ],
    });
    expect(diagnosis.score).toMatchObject({ answers: 8, mentioned: 3, missed: 5, cited: 0, prompts: 2, engines: [] });
    expect(diagnosis.actions).toHaveLength(1);
    expect(diagnosis.actions[0].tools).toEqual([{ tool: 'listicles_find', why: 'Save the lists', estCostUsd: 1.5 }]);
    expect(diagnosis.pages[0]).toMatchObject({ title: '<b>Best</b> tools', how: 'profile', citedInAnswers: 0 });
    expect(diagnosis.prompts.map((item) => item.google)).toEqual([
      { top20: true, position: 10 },
      { top20: false, position: undefined },
    ]);
    expect(diagnosis.citedPages).toBeNull();

    const empty = parseDiagnosis(null);
    expect(empty).toMatchObject({ brand: '', verdict: '', reasons: [], actions: [], whoWins: [], pages: [], prompts: [], limits: [], citedPages: null });
    expect(empty.score).toEqual({ answers: 0, mentioned: 0, cited: 0, missed: 0, prompts: 0, engines: [] });
  });

  it('refuses other tools, bad tokens and unsafe links', () => {
    expect(parseShared({ ok: true, data: { tool: 'keywords_research', data: {} } })).toBeNull();
    expect(parseShared({ ok: true, data: { tool: 'listicles_find' } })).toBeNull();
    expect(parseShared({ ok: true, data: { tool: 'ai_visibility_diagnose' } })).toBeNull();
    expect(isShareToken('abcDEF123_-')).toBe(true);
    expect(isShareToken('../etc')).toBe(false);
    expect(isShareToken('abc')).toBe(false);
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('https://example.com/a')).toBe('https://example.com/a');
  });
});

describe('pages for search', () => {
  it('has one page per agent with real setup steps, three prompts and tools that exist', () => {
    expect(AGENT_PAGES.map((page) => page.slug)).toEqual(['claude-code', 'codex', 'cursor', 'claude', 'chatgpt']);
    for (const page of AGENT_PAGES) {
      expect(agentById(page.agentId)).toBeDefined();
      expect(page.prompts).toHaveLength(3);
      for (const prompt of page.prompts) for (const tool of prompt.tools) expect(TOOL_BY_NAME.has(tool)).toBe(true);
    }
  });

  it('states the AI visibility price that the tool charges', () => {
    expect(TOOL_BY_NAME.get('ai_visibility_check')!.price).toBe('$0.08 per prompt per assistant');
    expect(TOOL_BY_NAME.get('ai_visibility_check')!.description).toContain('$0.08 per prompt per assistant');
  });

  it('shortens star counts', () => {
    expect(formatStars(0)).toBe('0');
    expect(formatStars(999)).toBe('999');
    expect(formatStars(1234)).toBe('1.2k');
    expect(formatStars(15000)).toBe('15k');
  });
});

describe('analytics snippets', () => {
  type Captured = { key: string; config: Record<string, unknown> };
  type SentEvent = { properties: Record<string, unknown>; $set?: Record<string, unknown> };

  const boot = (): Captured => {
    const captured: Captured = { key: '', config: {} };
    const posthog = { __SV: 1, init: (key: string, config: Record<string, unknown>) => Object.assign(captured, { key, config }) };
    new Function('document', 'window', 'posthog', posthogInit('phc_test'))({}, { posthog }, posthog);
    return captured;
  };

  it('initialises PostHog with pageviews on and recording off', () => {
    const { key, config } = boot();
    expect(key).toBe('phc_test');
    expect(config.capture_pageview).toBe('history_change');
    expect(config.disable_session_recording).toBe(true);
    expect(config.mask_all_text).toBe(true);
  });

  it('scrubs keys, tokens and emails from every event and tags the surface', () => {
    const beforeSend = boot().config.before_send as (event: SentEvent) => SentEvent;
    const event = beforeSend({
      properties: {
        $current_url: 'https://seoforagent.com/activate#sfa_live_abcDEF123_-xyz',
        $referrer: 'https://seoforagent.com/app/auth?token=secret123&a=1',
        nested: { who: 'someone@example.com wrote', path: '/mcp/sfa_live_zzz' },
        count: 5,
      },
      $set: { $initial_current_url: 'https://seoforagent.com/activate#sfa_live_abc' },
    });
    const text = JSON.stringify(event);
    expect(text).not.toMatch(/sfa_live_(?!redacted)/);
    expect(text).not.toContain('secret123');
    expect(text).not.toContain('someone@example.com');
    expect(event.properties.surface).toBe('sfa');
    expect(event.properties.count).toBe(5);
    expect(event.properties.$referrer).toBe('https://seoforagent.com/app/auth?token=redacted&a=1');
  });

  it('queues Rewardful calls until its script loads', () => {
    const fakeWindow: Record<string, unknown> = {};
    new Function('window', REWARDFUL_QUEUE)(fakeWindow);
    expect(fakeWindow._rwq).toBe('rewardful');
    (fakeWindow.rewardful as (...args: unknown[]) => void)('ready', 1);
    expect((fakeWindow.rewardful as unknown as { q: unknown[] }).q).toHaveLength(1);
  });
});
