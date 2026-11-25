import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { envelopeText, MAX_ARRAY_ITEMS } from '@/lib/format';
import { keyFromAuthorization, keyFromPath } from '@/lib/mcp';
import { TOOLS, TOOL_BY_NAME, buildRequest, toolAnnotations } from '@/lib/tools';

const EXPECTED_TOOLS = [
  'whoami',
  'wallet_get',
  'pricing_get',
  'account_link',
  'results_get',
  'results_share',
  'projects_list',
  'projects_create',
  'projects_get',
  'projects_update',
  'gsc_connect',
  'gsc_sites',
  'gsc_overview',
  'gsc_insights',
  'gsc_performance',
  'gsc_inspect_url',
  'keywords_research',
  'keywords_metrics',
  'serp_results',
  'serp_competitors',
  'domain_overview',
  'domain_keywords',
  'backlinks_profile',
  'backlinks_gap',
  'rank_check',
  'rank_history',
  'tracking_get',
  'tracking_set',
  'ai_visibility_check',
  'ai_visibility_diagnose',
  'ai_visibility_report',
  'listicles_find',
  'listicles_list',
  'listicles_get',
  'listicles_pitch',
  'backlinks_suggest',
  'backlinks_buying_get',
  'backlinks_buying_set',
  'backlinks_placements',
  'backlinks_quote',
  'backlinks_allocate',
];

const EXPECTED_ROUTES: Record<string, { method: string; path: string }> = {
  whoami: { method: 'GET', path: '/sfa/whoami' },
  wallet_get: { method: 'GET', path: '/sfa/wallet' },
  pricing_get: { method: 'GET', path: '/sfa/pricing' },
  account_link: { method: 'POST', path: '/sfa/account/link' },
  results_get: { method: 'GET', path: '/sfa/results/res_1' },
  results_share: { method: 'POST', path: '/sfa/results/res_1/share' },
  projects_list: { method: 'GET', path: '/sfa/projects' },
  projects_create: { method: 'POST', path: '/sfa/projects' },
  projects_get: { method: 'GET', path: '/sfa/projects/prj_1' },
  projects_update: { method: 'PATCH', path: '/sfa/projects/prj_1' },
  gsc_connect: { method: 'POST', path: '/sfa/gsc/connect' },
  gsc_sites: { method: 'GET', path: '/sfa/gsc' },
  gsc_overview: { method: 'GET', path: '/sfa/gsc/overview' },
  gsc_insights: { method: 'POST', path: '/sfa/gsc/insights' },
  gsc_performance: { method: 'POST', path: '/sfa/gsc/query' },
  gsc_inspect_url: { method: 'POST', path: '/sfa/gsc/inspect' },
  keywords_research: { method: 'POST', path: '/sfa/keywords/research' },
  keywords_metrics: { method: 'POST', path: '/sfa/keywords/metrics' },
  serp_results: { method: 'POST', path: '/sfa/serp' },
  serp_competitors: { method: 'POST', path: '/sfa/serp/competitors' },
  domain_overview: { method: 'POST', path: '/sfa/domains/overview' },
  domain_keywords: { method: 'POST', path: '/sfa/domains/keywords' },
  backlinks_profile: { method: 'POST', path: '/sfa/backlinks/profile' },
  backlinks_gap: { method: 'POST', path: '/sfa/backlinks/gap' },
  rank_check: { method: 'POST', path: '/sfa/projects/prj_1/rank-check' },
  rank_history: { method: 'GET', path: '/sfa/projects/prj_1/rank-history' },
  tracking_get: { method: 'GET', path: '/sfa/projects/prj_1/tracking' },
  tracking_set: { method: 'PUT', path: '/sfa/projects/prj_1/tracking' },
  ai_visibility_check: { method: 'POST', path: '/sfa/ai/check' },
  ai_visibility_diagnose: { method: 'POST', path: '/sfa/ai/diagnose' },
  ai_visibility_report: { method: 'GET', path: '/sfa/projects/prj_1/ai-visibility' },
  listicles_find: { method: 'POST', path: '/sfa/projects/prj_1/listicles/find' },
  listicles_list: { method: 'GET', path: '/sfa/projects/prj_1/listicles' },
  listicles_get: { method: 'POST', path: '/sfa/projects/prj_1/listicles/lst_1' },
  listicles_pitch: { method: 'POST', path: '/sfa/projects/prj_1/listicles/lst_1/pitch' },
  backlinks_suggest: { method: 'POST', path: '/sfa/projects/prj_1/backlinks/suggest' },
  backlinks_buying_get: { method: 'GET', path: '/sfa/projects/prj_1/backlinks' },
  backlinks_buying_set: { method: 'PATCH', path: '/sfa/projects/prj_1/backlinks' },
  backlinks_placements: { method: 'GET', path: '/sfa/projects/prj_1/backlinks/placements' },
  backlinks_quote: { method: 'POST', path: '/sfa/projects/prj_1/backlinks/quote' },
  backlinks_allocate: { method: 'POST', path: '/sfa/projects/prj_1/backlinks/allocate' },
};

const SAMPLE_ARGS = { project_id: 'prj_1', result_id: 'res_1', page_id: 'lst_1', quote_id: 'q_1' };

describe('tool registry', () => {
  it('has unique tool names', () => {
    const names = TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('exposes exactly the v1 tools', () => {
    expect(TOOLS.map((tool) => tool.name).sort()).toEqual([...EXPECTED_TOOLS].sort());
  });

  it('uses area_verb names that MCP clients accept', () => {
    for (const tool of TOOLS) expect(tool.name).toMatch(/^[a-z]+(_[a-z]+)*$/);
  });

  it.each(TOOLS.map((tool) => [tool.name, tool] as const))('%s builds its route', (name, tool) => {
    const request = buildRequest(tool, { ...SAMPLE_ARGS });
    expect(request.method).toBe(EXPECTED_ROUTES[name].method);
    expect(request.path).toBe(EXPECTED_ROUTES[name].path);
  });

  it('keeps path arguments out of the body and query', () => {
    const tool = TOOL_BY_NAME.get('listicles_pitch')!;
    const request = buildRequest(tool, { project_id: 'prj_1', page_id: 'lst_1', tone: 'direct', dry_run: true });
    expect(request.body).toEqual({ tone: 'direct', dry_run: true });
  });

  it('sends GET arguments as query parameters', () => {
    const tool = TOOL_BY_NAME.get('gsc_overview')!;
    const request = buildRequest(tool, { days: 90, sites: 'acme.com,other.io' });
    expect(request.body).toBeUndefined();
    expect(request.query.get('days')).toBe('90');
    expect(request.query.get('sites')).toBe('acme.com,other.io');
  });

  it('sends Search Console report arguments in the body', () => {
    const tool = TOOL_BY_NAME.get('gsc_performance')!;
    const request = buildRequest(tool, { site: 'sc-domain:acme.com', dimensions: ['query', 'page'], compare: true, filters: { page_contains: '/blog' } });
    expect(request.method).toBe('POST');
    expect(request.body).toEqual({ site: 'sc-domain:acme.com', dimensions: ['query', 'page'], compare: true, filters: { page_contains: '/blog' } });
  });

  it('encodes ids in paths', () => {
    const tool = TOOL_BY_NAME.get('projects_get')!;
    expect(buildRequest(tool, { project_id: 'a/b?c' }).path).toBe('/sfa/projects/a%2Fb%3Fc');
  });

  it('rejects a missing path id', () => {
    const tool = TOOL_BY_NAME.get('projects_get')!;
    expect(() => buildRequest(tool, {})).toThrow();
  });

  it('gives every paid tool dry_run, max_cost_usd and fresh', () => {
    for (const tool of TOOLS.filter((item) => item.kind === 'paid')) {
      expect(Object.keys(tool.input)).toEqual(expect.arrayContaining(['dry_run', 'max_cost_usd', 'fresh']));
    }
  });

  it('derives the allocate idempotency key from the quote and requires confirm_usd', () => {
    const tool = TOOL_BY_NAME.get('backlinks_allocate')!;
    const request = buildRequest(tool, { project_id: 'prj_1', quote_id: 'q_42', confirm_usd: 160 });
    expect(request.idempotencyKey).toBe('sfa-allocate-q_42');
    expect(request.body).toEqual({ quote_id: 'q_42', confirm_usd: 160 });
    const schema = z.object(tool.input);
    expect(schema.safeParse({ project_id: 'prj_1', quote_id: 'q_42' }).success).toBe(false);
    expect(schema.safeParse({ project_id: 'prj_1', confirm_usd: 160 }).success).toBe(false);
  });

  it('sets link buying per product and drops the old single-product inputs', () => {
    const tool = TOOL_BY_NAME.get('backlinks_buying_set')!;
    expect(Object.keys(tool.input).sort()).toEqual(['backlinks', 'listicles', 'min_domain_rating', 'project_id', 'target_pages']);
    const args = {
      project_id: 'prj_1',
      min_domain_rating: 40,
      listicles: { enabled: true, monthly_credit_budget: 320, topics: ['ai video editors'] },
      backlinks: { enabled: true, monthly_credit_budget: 160 },
    };
    const request = buildRequest(tool, args);
    expect(request.method).toBe('PATCH');
    expect(request.body).toEqual({ min_domain_rating: 40, listicles: args.listicles, backlinks: args.backlinks });
    const schema = z.object(tool.input);
    expect(schema.safeParse(args).success).toBe(true);
    expect(schema.safeParse({ project_id: 'prj_1', backlinks: { monthly_credit_budget: 60 } }).success).toBe(true);
    expect(schema.safeParse({ project_id: 'prj_1', backlinks: { monthly_credit_budget: 59 } }).success).toBe(false);
    expect(schema.safeParse({ project_id: 'prj_1', listicles: { monthly_credit_budget: 120 } }).success).toBe(true);
    expect(schema.safeParse({ project_id: 'prj_1', listicles: { monthly_credit_budget: 119 } }).success).toBe(false);
    expect(schema.safeParse({ project_id: 'prj_1', listicles: { topics: Array.from({ length: 11 }, (_, index) => `topic ${index}`) } }).success).toBe(false);
    expect(schema.safeParse({ project_id: 'prj_1', min_domain_rating: 71 }).success).toBe(false);
    expect(tool.description).toContain('DR × 4 credits');
    expect(tool.description).toContain('DR × 2 credits');
    expect(tool.description).toMatch(/never turn one on or raise a budget without the human yes/);
  });

  it('quotes from 60 credits or $48 and prices both products at DR 40', () => {
    const quote = TOOL_BY_NAME.get('backlinks_quote')!;
    const schema = z.object(quote.input);
    expect(schema.safeParse({ project_id: 'prj_1', credits: 60 }).success).toBe(true);
    expect(schema.safeParse({ project_id: 'prj_1', credits: 59 }).success).toBe(false);
    expect(schema.safeParse({ project_id: 'prj_1', amount_usd: 48 }).success).toBe(true);
    expect(schema.safeParse({ project_id: 'prj_1', amount_usd: 47 }).success).toBe(false);
    for (const name of ['backlinks_quote', 'backlinks_allocate']) {
      const description = TOOL_BY_NAME.get(name)!.description;
      expect(description).toContain('80 credits, $64');
      expect(description).toContain('160 credits, $128');
      expect(description).toContain('60 credits ($48)');
    }
  });

  it('describes both link products where agents read about buying', () => {
    expect(TOOL_BY_NAME.get('backlinks_buying_get')!.description).toMatch(/own on\/off switch, monthly credit budget, spend this month and blockers/);
    expect(TOOL_BY_NAME.get('backlinks_placements')!.description).toContain('product (listicle or backlink)');
    expect(TOOL_BY_NAME.get('backlinks_suggest')!.description).toMatch(/buy field .* a backlink first .* then a listicle placement/);
    for (const tool of TOOLS) expect(tool.description).not.toMatch(/prefer_listicle|listicle preference|listicle_topics/);
  });

  it('shares with POST and unshares with DELETE, without sending the switch', () => {
    const tool = TOOL_BY_NAME.get('results_share')!;
    const share = buildRequest(tool, { result_id: 'res_1' });
    expect(share.method).toBe('POST');
    expect(share.body).toEqual({});
    expect(buildRequest(tool, { result_id: 'res_1', shared: true }).method).toBe('POST');
    const unshare = buildRequest(tool, { result_id: 'res_1', shared: false });
    expect(unshare.method).toBe('DELETE');
    expect(unshare.path).toBe('/sfa/results/res_1/share');
    expect(unshare.body).toBeUndefined();
    expect(unshare.query.toString()).toBe('');
    expect(tool.kind).toBe('write');
  });

  it('sends the tracking blocks as a PUT body and validates them', () => {
    const tool = TOOL_BY_NAME.get('tracking_set')!;
    const rank = { enabled: true, cadence: 'weekly', keywords: ['ai video editor'] };
    const ai = { enabled: true, prompts: ['best ai video editor'], engines: ['chatgpt', 'claude'] };
    const request = buildRequest(tool, { project_id: 'prj_1', rank, ai });
    expect(request.method).toBe('PUT');
    expect(request.body).toEqual({ rank, ai });
    const schema = z.object(tool.input);
    expect(schema.safeParse({ project_id: 'prj_1', rank }).success).toBe(true);
    expect(schema.safeParse({ project_id: 'prj_1', rank: { ...rank, cadence: 'hourly' } }).success).toBe(false);
    expect(schema.safeParse({ project_id: 'prj_1', ai: { ...ai, engines: ['bing'] } }).success).toBe(false);
    expect(TOOL_BY_NAME.get('tracking_get')!.kind).toBe('read');
    expect(tool.kind).toBe('write');
    expect(tool.price).toMatch(/^Free/);
  });

  it('annotates money tools as destructive and read tools as read-only', () => {
    for (const tool of TOOLS) {
      const annotations = toolAnnotations(tool);
      if (tool.kind === 'money') expect(annotations.destructiveHint).toBe(true);
      if (tool.kind === 'read') expect(annotations.readOnlyHint).toBe(true);
      if (tool.kind !== 'money') expect(annotations.destructiveHint).toBe(false);
    }
  });

  it('writes descriptions that state a price', () => {
    for (const tool of TOOLS) {
      expect(tool.description.length).toBeGreaterThan(120);
      expect(tool.description).toMatch(/Free|\$\d/);
    }
  });
});

describe('MCP helpers', () => {
  it('reads keys from the header and the path', () => {
    expect(keyFromAuthorization('Bearer sfa_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG')).toBe(
      'sfa_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    );
    expect(keyFromAuthorization('Basic abc')).toBeNull();
    expect(keyFromAuthorization(null)).toBeNull();
    expect(keyFromPath('sfa_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG')).toBe('sfa_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG');
    expect(keyFromPath('../etc')).toBeNull();
  });

  it('trims long arrays in the text and points at results_get', () => {
    const rows = Array.from({ length: 120 }, (_, index) => ({ keyword: `k${index}` }));
    const text = envelopeText({ ok: true, data: { rows }, result_id: 'res_9' });
    const json = JSON.parse(text.split('\n\nNote:')[0]);
    expect(json.data.rows).toHaveLength(MAX_ARRAY_ITEMS);
    expect(text).toContain('results_get');
    expect(text).toContain('res_9');
    expect(text).toContain('data.rows (25 of 120)');
  });

  it('leaves short envelopes untouched', () => {
    const envelope = { ok: true, data: { rows: [1, 2, 3] } };
    expect(JSON.parse(envelopeText(envelope))).toEqual(envelope);
  });
});
