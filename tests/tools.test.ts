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
  'projects_list',
  'projects_create',
  'projects_get',
  'projects_update',
  'gsc_connect',
  'gsc_performance',
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
  'ai_visibility_check',
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
  projects_list: { method: 'GET', path: '/sfa/projects' },
  projects_create: { method: 'POST', path: '/sfa/projects' },
  projects_get: { method: 'GET', path: '/sfa/projects/prj_1' },
  projects_update: { method: 'PATCH', path: '/sfa/projects/prj_1' },
  gsc_connect: { method: 'POST', path: '/products/prj_1/gsc/connect' },
  gsc_performance: { method: 'GET', path: '/products/prj_1/gsc/search-analytics' },
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
  ai_visibility_check: { method: 'POST', path: '/sfa/ai/check' },
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
    const tool = TOOL_BY_NAME.get('gsc_performance')!;
    const request = buildRequest(tool, { project_id: 'prj_1', dimensions: ['query', 'page'], limit: 50 });
    expect(request.body).toBeUndefined();
    expect(request.query.get('dimensions')).toBe('query,page');
    expect(request.query.get('limit')).toBe('50');
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
