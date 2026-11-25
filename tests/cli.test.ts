import { chmodSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { KEY_PATTERN } from '@/lib/config';
import { claudeCodeCommand, codexConfig as siteCodexConfig, cursorConfig as siteCursorConfig } from '@/lib/setup';
import {
  activationLink,
  callTool,
  claudeArgs,
  claudeCommand,
  codexConfig,
  cursorConfig,
  findOnPath,
  connectedMessage,
  connectLink,
  connectProgress,
  envelopeFromRpc,
  firstSentence,
  formatChange,
  formatCtr,
  formatDelta,
  formatNumber,
  formatPosition,
  formatTable,
  generateKey,
  insightsLines,
  inspectLines,
  isKey,
  keyFilePath,
  listTools,
  openCommand,
  overviewLines,
  parseArgs,
  parseRpcBody,
  performanceLines,
  readSavedKey,
  resolveKey,
  saveKey,
  siteUrl,
  sitesLines,
  statusLines,
  toolRequest,
  toolsLines,
  VERSION,
} from '../cli/lib/core.mjs';
import cliPackage from '../cli/package.json';

describe('cli key generation', () => {
  it('generates keys the site accepts', () => {
    const key = generateKey();
    expect(key).toMatch(KEY_PATTERN);
    expect(key.startsWith('sfa_live_')).toBe(true);
    expect(key).toHaveLength('sfa_live_'.length + 43);
    expect(isKey(key)).toBe(true);
  });

  it('generates a different key every time', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateKey()));
    expect(keys.size).toBe(200);
  });

  it('rejects values that are not keys', () => {
    expect(isKey('sfa_live_short')).toBe(false);
    expect(isKey('sk_live_' + 'a'.repeat(43))).toBe(false);
    expect(isKey(undefined)).toBe(false);
  });

  it('builds the activation link with the key in the fragment', () => {
    const key = generateKey();
    expect(activationLink(key)).toBe(`https://seoforagent.com/activate#${key}`);
  });
});

describe('cli argument parsing', () => {
  it('defaults to help', () => {
    const parsed = parseArgs([]);
    expect(parsed.command).toBe('help');
    expect(parsed.errors).toEqual([]);
    expect(parsed.flags).toMatchObject({ key: null, yes: false, help: false, version: false, json: false });
  });

  it('reads the command and its flags in any order', () => {
    expect(parseArgs(['init', '--yes']).flags.yes).toBe(true);
    expect(parseArgs(['-y', 'init']).command).toBe('init');
    expect(parseArgs(['status', '--key', 'abc']).flags.key).toBe('abc');
    expect(parseArgs(['status', '--key=abc']).flags.key).toBe('abc');
    expect(parseArgs(['--version']).flags.version).toBe(true);
    expect(parseArgs(['init', '-h']).flags.help).toBe(true);
  });

  it('reports unknown commands, unknown options and missing values', () => {
    expect(parseArgs(['publish']).errors).toEqual(['Unknown command publish.']);
    expect(parseArgs(['init', '--force']).errors).toEqual(['Unknown option --force.']);
    expect(parseArgs(['status', '--key']).errors).toEqual(['--key needs a value.']);
    expect(parseArgs(['status', '--key', '--yes']).errors).toEqual(['--key needs a value.']);
    expect(parseArgs(['init', 'extra']).errors).toEqual(['Unexpected argument extra.']);
  });
});

describe('cli agent setup', () => {
  const key = 'sfa_live_' + 'a'.repeat(43);

  it('passes the key to claude as one argument, never through a shell', () => {
    expect(claudeArgs(key)).toEqual(['mcp', 'add', '--transport', 'http', 'seoforagent', 'https://seoforagent.com/mcp', '--header', `Authorization: Bearer ${key}`]);
  });

  it('prints the same config as the site', () => {
    expect(claudeCommand(key)).toBe(claudeCodeCommand(key).replace(/ \\\n\s+/g, ' '));
    expect(codexConfig(key)).toBe(siteCodexConfig(key));
    expect(cursorConfig(key)).toBe(siteCursorConfig(key));
  });

  it('finds a binary on PATH and returns null when it is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sfa-cli-'));
    const binary = join(dir, 'claude');
    writeFileSync(binary, '#!/bin/sh\n');
    chmodSync(binary, 0o755);
    expect(findOnPath('claude', { PATH: `/nonexistent-sfa:${dir}` }, 'linux')).toBe(binary);
    expect(findOnPath('claude', { PATH: '/nonexistent-sfa' }, 'linux')).toBeNull();
    expect(findOnPath('claude', {}, 'linux')).toBeNull();
  });

  it('reads the site origin from the environment', () => {
    expect(siteUrl({})).toBe('https://seoforagent.com');
    expect(siteUrl({ SEOFORAGENT_URL: 'http://localhost:3462/' })).toBe('http://localhost:3462');
  });

  it('formats the plan and balances', () => {
    expect(
      statusLines({
        access: { plan_label: 'Growth plan', active: true },
        balance: { included_left_usd: 41.2, included_per_period_usd: 55, credit_usd: 0 },
        projects: [{}, {}],
      }),
    ).toEqual(['Plan: Growth plan', 'Included usage left: $41.20 of $55.00', 'One-time credit: $0.00', 'Projects: 2']);
    expect(statusLines({ access: { active: false } })).toEqual(['Plan: No plan (not active)', 'One-time credit: $0.00']);
  });
});

const KEY = 'sfa_live_' + 'a'.repeat(43);

describe('cli version', () => {
  it('matches the package version', () => {
    expect(VERSION).toBe(cliPackage.version);
    expect(VERSION).toBe('0.2.0');
  });
});

describe('cli new command parsing', () => {
  it('reads call with a tool and JSON arguments', () => {
    const parsed = parseArgs(['call', 'whoami', '{"a":1}', '--json']);
    expect(parsed.errors).toEqual([]);
    expect(parsed.command).toBe('call');
    expect(parsed.positionals).toEqual(['whoami', '{"a":1}']);
    expect(parsed.flags.json).toBe(true);
    expect(toolRequest(parsed)).toEqual({ name: 'whoami', arguments: { a: 1 } });
    expect(toolRequest(parseArgs(['call', 'whoami']))).toEqual({ name: 'whoami', arguments: {} });
  });

  it('rejects call without a tool, bad JSON and extra arguments', () => {
    expect(parseArgs(['call']).errors).toEqual(['call needs <tool>.']);
    expect(parseArgs(['call', 'whoami', '[1]']).errors[0]).toMatch(/must be a JSON object/);
    expect(parseArgs(['call', 'whoami', '{oops']).errors[0]).toMatch(/must be a JSON object/);
    expect(parseArgs(['call', 'whoami', '{}', 'more']).errors).toEqual(['Unexpected argument more.']);
  });

  it('reads tools', () => {
    expect(parseArgs(['tools']).errors).toEqual([]);
    expect(parseArgs(['tools', '--json']).flags.json).toBe(true);
    expect(parseArgs(['tools', 'extra']).errors).toEqual(['Unexpected argument extra.']);
  });

  it('reads every gsc command', () => {
    for (const subcommand of ['connect', 'sites', 'overview']) {
      const parsed = parseArgs(['gsc', subcommand]);
      expect(parsed.errors).toEqual([]);
      expect(parsed.subcommand).toBe(subcommand);
    }
    expect(parseArgs(['gsc', 'query', 'example.com']).positionals).toEqual(['example.com']);
    expect(parseArgs(['gsc', 'insights', 'example.com']).positionals).toEqual(['example.com']);
    expect(parseArgs(['gsc', 'inspect', 'https://example.com/a']).positionals).toEqual(['https://example.com/a']);
  });

  it('reports missing or unknown gsc commands and arguments', () => {
    expect(parseArgs(['gsc']).errors).toEqual(['gsc needs a command: connect, sites, overview, query, insights, inspect.']);
    expect(parseArgs(['gsc', 'nope']).errors[0]).toMatch(/^Unknown gsc command nope\./);
    expect(parseArgs(['gsc', 'query']).errors).toEqual(['gsc query needs <site>.']);
    expect(parseArgs(['gsc', 'inspect']).errors).toEqual(['gsc inspect needs <url>.']);
    expect(parseArgs(['gsc', 'sites', 'extra']).errors).toEqual(['Unexpected argument extra.']);
    expect(parseArgs(['gsc', 'query', '--help']).errors).toEqual([]);
    expect(parseArgs(['gsc', '--help']).errors).toEqual([]);
  });

  it('reads every new flag', () => {
    const parsed = parseArgs([
      'gsc',
      'query',
      'example.com',
      '--dimensions',
      'query, Page',
      '--days=90',
      '--compare',
      '--limit',
      '50',
      '--query-contains',
      'seo tool',
      '--page-contains=/blog',
      '--country',
      'USA',
      '--device',
      'mobile',
      '--json',
      '--key',
      KEY,
    ]);
    expect(parsed.errors).toEqual([]);
    expect(parsed.flags).toMatchObject({
      dimensions: ['query', 'page'],
      days: 90,
      compare: true,
      limit: 50,
      queryContains: 'seo tool',
      pageContains: '/blog',
      country: 'usa',
      device: 'MOBILE',
      json: true,
      key: KEY,
    });
    expect(parseArgs(['gsc', 'connect', '--no-open']).flags.noOpen).toBe(true);
    expect(parseArgs(['gsc', 'overview', '--days', '7']).flags.days).toBe(7);
  });

  it('validates flag values', () => {
    expect(parseArgs(['gsc', 'overview', '--days', '30']).errors).toEqual(['gsc overview takes --days 7, 28, 90.']);
    expect(parseArgs(['gsc', 'query', 'x', '--days', 'many']).errors[0]).toMatch(/^--days takes/);
    expect(parseArgs(['gsc', 'query', 'x', '--limit', '0']).errors[0]).toMatch(/^--limit takes/);
    expect(parseArgs(['gsc', 'query', 'x', '--dimensions', 'query,keyword']).errors[0]).toMatch(/^--dimensions takes/);
    expect(parseArgs(['gsc', 'query', 'x', '--device', 'watch']).errors[0]).toMatch(/^--device takes/);
    expect(parseArgs(['gsc', 'query', 'x', '--country', 'us']).errors[0]).toMatch(/^--country takes/);
    expect(parseArgs(['gsc', 'query', 'x', '--country']).errors).toEqual(['--country needs a value.']);
  });

  it('rejects flags that do not apply to the command', () => {
    expect(parseArgs(['gsc', 'sites', '--days', '28']).errors).toEqual(['--days does not apply to gsc sites.']);
    expect(parseArgs(['init', '--json']).errors).toEqual(['--json does not apply to init.']);
    expect(parseArgs(['gsc', 'overview', '--compare']).errors).toEqual(['--compare does not apply to gsc overview.']);
    expect(parseArgs(['status', '--yes']).errors).toEqual([]);
  });
});

describe('cli gsc request bodies', () => {
  const request = (argv: string[]) => toolRequest(parseArgs(argv));

  it('builds the arguments of each gsc tool', () => {
    expect(request(['gsc', 'connect'])).toEqual({ name: 'gsc_connect', arguments: {} });
    expect(request(['gsc', 'sites'])).toEqual({ name: 'gsc_sites', arguments: {} });
    expect(request(['gsc', 'overview'])).toEqual({ name: 'gsc_overview', arguments: {} });
    expect(request(['gsc', 'overview', '--days', '90'])).toEqual({ name: 'gsc_overview', arguments: { days: 90 } });
    expect(request(['gsc', 'insights', 'example.com', '--days', '28'])).toEqual({ name: 'gsc_insights', arguments: { site: 'example.com', days: 28 } });
    expect(request(['gsc', 'inspect', 'https://example.com/a'])).toEqual({ name: 'gsc_inspect_url', arguments: { url: 'https://example.com/a' } });
  });

  it('omits unset gsc_performance fields', () => {
    expect(request(['gsc', 'query', 'example.com'])).toEqual({ name: 'gsc_performance', arguments: { site: 'example.com' } });
    expect(request(['gsc', 'query', 'example.com', '--device', 'tablet'])).toEqual({
      name: 'gsc_performance',
      arguments: { site: 'example.com', filters: { device: 'TABLET' } },
    });
  });

  it('builds the full gsc_performance body', () => {
    expect(
      request([
        'gsc',
        'query',
        'sc-domain:example.com',
        '--dimensions',
        'query,page',
        '--days',
        '28',
        '--compare',
        '--limit',
        '50',
        '--query-contains',
        'x',
        '--page-contains',
        'y',
        '--country',
        'usa',
        '--device',
        'MOBILE',
      ]),
    ).toEqual({
      name: 'gsc_performance',
      arguments: {
        site: 'sc-domain:example.com',
        dimensions: ['query', 'page'],
        days: 28,
        compare: true,
        row_limit: 50,
        filters: { query_contains: 'x', page_contains: 'y', country: 'usa', device: 'MOBILE' },
      },
    });
  });
});

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('cli MCP client', () => {
  const envelope = { ok: true, data: { sites: [] }, agent_guidance: 'Done.' };
  const rpc = { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'trimmed' }], structuredContent: envelope, isError: false } };

  it('reads a plain JSON answer', () => {
    expect(parseRpcBody(JSON.stringify(rpc))).toEqual(rpc);
    expect(envelopeFromRpc(parseRpcBody(JSON.stringify(rpc)))).toEqual(envelope);
  });

  it('reads the last data line of an SSE answer', () => {
    const progress = { jsonrpc: '2.0', method: 'notifications/progress', params: {} };
    const body = `event: message\ndata: ${JSON.stringify(progress)}\n\nevent: message\ndata: ${JSON.stringify(rpc)}\n\n`;
    expect(parseRpcBody(body)).toEqual(rpc);
    expect(parseRpcBody('event: message\r\ndata: ' + JSON.stringify(rpc) + '\r\n\r\n')).toEqual(rpc);
    expect(parseRpcBody('')).toBeNull();
    expect(parseRpcBody('<html>nope</html>')).toBeNull();
  });

  it('turns JSON-RPC errors and text-only results into envelopes', () => {
    expect(envelopeFromRpc({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Tool nope not found' } })).toMatchObject({
      ok: false,
      error: { code: 'MCP_ERROR', message: 'Tool nope not found' },
    });
    expect(envelopeFromRpc({ result: { content: [{ type: 'text', text: 'Boom' }], isError: true } })).toMatchObject({ ok: false, error: { message: 'Boom' } });
    expect(envelopeFromRpc({ result: { content: [{ type: 'text', text: '{"ok":true,"data":1}' }] } })).toEqual({ ok: true, data: 1 });
    expect(envelopeFromRpc({ result: { structuredContent: { data: 2 }, isError: true } })).toEqual({ ok: false, data: 2 });
    expect(envelopeFromRpc(null)).toMatchObject({ ok: false, error: { code: 'BAD_RESPONSE' } });
  });

  it('posts tools/call with the MCP headers and returns the envelope', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(rpc));
    const result = await callTool('gsc_sites', { a: 1 }, { site: 'https://seoforagent.com', key: KEY, fetchImpl });
    expect(result).toEqual(envelope);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://seoforagent.com/mcp');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    });
    expect(JSON.parse(String(init?.body))).toEqual({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'gsc_sites', arguments: { a: 1 } } });
  });

  it('reads an SSE stream from fetch', async () => {
    const fetchImpl = vi.fn(async () => new Response(`event: message\ndata: ${JSON.stringify(rpc)}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } }));
    expect(await callTool('gsc_sites', {}, { site: 'https://x.test', key: KEY, fetchImpl })).toEqual(envelope);
  });

  it('reports network and HTTP failures as envelopes', async () => {
    const offline = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(await callTool('whoami', {}, { site: 'http://127.0.0.1:9', key: KEY, fetchImpl: offline })).toMatchObject({
      ok: false,
      error: { code: 'NETWORK_ERROR', message: 'Could not reach http://127.0.0.1:9. Check your connection and try again.' },
    });
    const unauthorized = vi.fn(async () => new Response('', { status: 401 }));
    expect(await callTool('whoami', {}, { site: 'https://x.test', key: KEY, fetchImpl: unauthorized })).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    const broken = vi.fn(async () => new Response('Bad gateway', { status: 502 }));
    expect(await callTool('whoami', {}, { site: 'https://x.test', key: KEY, fetchImpl: broken })).toMatchObject({
      ok: false,
      error: { code: 'HTTP_ERROR', message: 'SEOforAgent answered with HTTP 502 and no readable body.' },
    });
  });

  it('lists tools', async () => {
    const tools = [{ name: 'whoami', description: 'Returns the plan. Free.', inputSchema: {} }];
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse({ jsonrpc: '2.0', id: 1, result: { tools } }));
    expect(await listTools({ site: 'https://x.test', key: KEY, fetchImpl })).toEqual({ ok: true, data: tools });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body)).method).toBe('tools/list');
    expect(toolsLines(tools)).toEqual(['Tool    What it does', 'whoami  Returns the plan.']);
  });
});

describe('cli key resolution', () => {
  it('prefers --key, then the environment, then the saved key', () => {
    const readSaved = () => 'saved-key';
    expect(resolveKey({ flag: 'flag-key', env: { SEOFORAGENT_API_KEY: 'env-key' }, readSaved })).toEqual({ key: 'flag-key', source: '--key' });
    expect(resolveKey({ env: { SEOFORAGENT_API_KEY: 'env-key' }, readSaved })).toEqual({ key: 'env-key', source: 'SEOFORAGENT_API_KEY' });
    expect(resolveKey({ env: {}, readSaved })).toEqual({ key: 'saved-key', source: 'saved' });
    expect(resolveKey({ env: {}, readSaved: () => null })).toEqual({ key: null, source: null });
  });

  it('stores the key under XDG_CONFIG_HOME or ~/.config with mode 0600', () => {
    expect(keyFilePath({}, '/home/me')).toBe('/home/me/.config/seoforagent/key');
    expect(keyFilePath({ XDG_CONFIG_HOME: '/xdg' }, '/home/me')).toBe('/xdg/seoforagent/key');
    expect(keyFilePath({ XDG_CONFIG_HOME: 'relative' }, '/home/me')).toBe('/home/me/.config/seoforagent/key');
    const dir = mkdtempSync(join(tmpdir(), 'sfa-key-'));
    const path = keyFilePath({ XDG_CONFIG_HOME: dir });
    expect(readSavedKey(path)).toBeNull();
    expect(saveKey(KEY, path)).toBe(path);
    expect(readFileSync(path, 'utf8')).toBe(`${KEY}\n`);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(readSavedKey(path)).toBe(KEY);
    expect(resolveKey({ env: { XDG_CONFIG_HOME: dir } })).toEqual({ key: KEY, source: 'saved' });
  });
});

describe('cli formatting', () => {
  it('formats numbers, CTR, changes and positions', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(-1234.4)).toBe('-1,234');
    expect(formatNumber(12)).toBe('12');
    expect(formatNumber(undefined)).toBe('–');
    expect(formatCtr(0.034)).toBe('3.4%');
    expect(formatCtr(null)).toBe('–');
    expect(formatChange(12.345)).toBe('+12.3%');
    expect(formatChange(-4)).toBe('-4.0%');
    expect(formatChange(null)).toBe('–');
    expect(formatDelta(1500)).toBe('+1,500');
    expect(formatDelta(-3)).toBe('-3');
    expect(formatPosition(7.26)).toBe('7.3');
  });

  it('pads columns, right-aligns numbers and truncates long cells', () => {
    const long = 'x'.repeat(80);
    expect(formatTable(['Name', 'Clicks'], [['a', '1,234'], [long, '5']])).toEqual([
      `Name${' '.repeat(56)}  Clicks`,
      `a${' '.repeat(59)}   1,234`,
      `${'x'.repeat(59)}…       5`,
    ]);
    expect(formatTable(['A', 'B'], [[null, '']])).toEqual(['A  B', '–  –']);
  });

  it('prints the sites table and pending accounts', () => {
    expect(
      sitesLines({
        connected: true,
        sites: [
          { site_url: 'sc-domain:example.com', google_email: 'me@example.com', project: { name: 'Example' } },
          { site_url: 'https://blog.example.com/', google_email: 'me@example.com', project_id: 'p1', project_name: 'Blog' },
        ],
        pending: [{ google_email: 'other@example.com', expires_at: '2026-11-25T12:00:00Z' }],
      }),
    ).toEqual([
      'Site                       Google account  Project',
      'sc-domain:example.com      me@example.com  Example',
      'https://blog.example.com/  me@example.com  Blog',
      '',
      'Google approved other@example.com. Finish on the seoforagent.com page that opened (sign in there if asked).',
    ]);
    expect(sitesLines({ connected: false, sites: [] })).toEqual(['No Search Console sites yet. Run: npx seoforagent gsc connect']);
  });

  it('prints the overview with totals', () => {
    expect(
      overviewLines({
        days: 28,
        sites: [{ domain: 'example.com', clicks: 12345, clicks_change_pct: 5.25, impressions: 456789, impressions_change_pct: null, ctr: 0.027, position: 14.06 }],
        totals: { clicks: 12345, clicks_change_pct: 5.25, impressions: 456789, impressions_change_pct: null, ctr: 0.027, position: 14.06 },
      }),
    ).toEqual([
      'Domain       Clicks  Change  Impressions  Change   CTR  Position',
      'example.com  12,345   +5.3%      456,789       –  2.7%      14.1',
      '',
      'Total (last 28 days): 12,345 clicks (+5.3%), 456,789 impressions (–), CTR 2.7%, position 14.1',
    ]);
  });

  it('computes changes from previous values and lists sites that failed', () => {
    expect(
      overviewLines({
        days: 7,
        data_through: '2026-11-22',
        sites: [
          { site_url: 'sc-domain:a.com', domain: 'a.com', clicks: 110, clicks_prev: 100, impressions: 900, impressions_prev: 0, ctr: 0.12, position: 4 },
          { site_url: 'https://b.com/', domain: '', ok: false, error: 'Google said permission denied.' },
        ],
        totals: { clicks: 110, clicks_prev: 100, impressions: 900, impressions_prev: 1000 },
      }),
    ).toEqual([
      'Domain          Clicks  Change  Impressions  Change    CTR  Position',
      'a.com              110  +10.0%          900       –  12.0%       4.0',
      'https://b.com/       –       –            –       –      –         –',
      '',
      'Total (last 7 days, data through 2026-11-22): 110 clicks (+10.0%), 900 impressions (-10.0%), CTR 12.2%',
      'https://b.com/: Google said permission denied.',
    ]);
  });

  it('prints performance rows with their dimensions and the clicks change', () => {
    const data = {
      rows: [
        { keys: ['seo tool', 'https://example.com/'], clicks: 1200, impressions: 30000, ctr: 0.04, position: 3.21, clicks_change: 200 },
        { keys: ['agent seo', 'https://example.com/blog'], clicks: 5, impressions: 900, ctr: 0.0056, position: 11, clicks_change_pct: null },
      ],
    };
    expect(performanceLines(data, { dimensions: ['query', 'page'], compare: true })).toEqual([
      'Query      Page                      Clicks  Impressions   CTR  Position  Clicks change',
      'seo tool   https://example.com/       1,200       30,000  4.0%       3.2           +200',
      'agent seo  https://example.com/blog       5          900  0.6%      11.0              –',
    ]);
    expect(performanceLines({ rows: [{ query: 'x', clicks: 1, impressions: 2, ctr: 0.5, position: 1 }] })).toEqual([
      'Query  Clicks  Impressions    CTR  Position',
      'x           1            2  50.0%       1.0',
    ]);
    expect(performanceLines({ rows: [] })).toEqual(['No rows for these filters.']);
  });

  it('prints insights with the actions first and at most ten rows a section', () => {
    const lines = insightsLines({
      actions: ['Refresh /pricing', { id: 'faq', title: 'Add FAQ to /blog/a', why: 'It sits at position 11.', count: 1 }],
      pages_up: [{ page: 'https://example.com/a', clicks: 50, clicks_change: 20 }],
      queries: { down: Array.from({ length: 12 }, (_, index) => ({ query: `q${index}`, clicks: 10, clicks_change: -index })) },
      striking_distance: [{ query: 'seo agent', page: 'https://example.com/b', impressions: 4000, position: 11.4 }],
    });
    expect(lines.slice(0, 4)).toEqual(['What to do', '  1. Refresh /pricing', '  2. Add FAQ to /blog/a', '     It sits at position 11.']);
    expect(lines).toContain('Pages down');
    expect(lines[lines.indexOf('Pages down') + 1]).toBe('  None.');
    const queriesDown = lines.indexOf('Queries down');
    expect(lines.slice(queriesDown + 1, queriesDown + 13).filter((line) => /^ {2}q\d/.test(line))).toHaveLength(10);
    expect(lines.slice(-2)).toEqual([
      '  Query      Page                   Impressions  Position',
      '  seo agent  https://example.com/b        4,000      11.4',
    ]);
    expect(lines[lines.indexOf('Pages up') + 1]).toBe('  Page                   Clicks  Change');
  });

  it('prints the URL inspection', () => {
    expect(
      inspectLines({
        url: 'https://example.com/a',
        index_status: { verdict: 'PASS', coverage_state: 'Submitted and indexed', last_crawl_time: '2026-11-20T10:00:00Z', google_canonical: 'https://example.com/a' },
      }),
    ).toEqual([
      'URL:              https://example.com/a',
      'Verdict:          PASS',
      'Coverage:         Submitted and indexed',
      'Last crawl:       2026-11-20T10:00:00Z',
      'Google canonical: https://example.com/a',
    ]);
    expect(inspectLines({ verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' })).toEqual([
      'Verdict:          NEUTRAL',
      'Coverage:         Discovered - currently not indexed',
      'Last crawl:       –',
      'Google canonical: –',
    ]);
  });

  it('takes the first sentence of a tool description', () => {
    expect(firstSentence('Returns real clicks. Use it for the site.')).toBe('Returns real clicks.');
    expect(firstSentence('No period here')).toBe('No period here');
  });
});

describe('cli gsc connect', () => {
  it('finds the link in the gsc_connect answer', () => {
    expect(connectLink({ url: 'https://accounts.google.com/o/oauth2/auth?x=1' })).toBe('https://accounts.google.com/o/oauth2/auth?x=1');
    expect(connectLink({ auth_url: 'https://a.test' })).toBe('https://a.test');
    expect(connectLink({ connected: true })).toBeNull();
  });

  it('waits until connected and the sites grew or a new account appears', () => {
    const before = { connected: true, sites: [{ site_url: 'a.com', google_email: 'me@a.com' }] };
    expect(connectProgress(before, before).done).toBe(false);
    expect(connectProgress(before, { ...before, pending: ['you@b.com'] })).toEqual({ done: false, email: null, count: 1, pending: ['you@b.com'] });
    const grown = {
      connected: true,
      sites: [...before.sites, { site_url: 'b.com', google_email: 'you@b.com' }, { site_url: 'c.com', google_email: 'you@b.com' }],
    };
    expect(connectProgress(before, grown)).toEqual({ done: true, email: 'you@b.com', count: 2, pending: [] });
    expect(connectProgress({}, { connected: true, sites: [], accounts: [{ email: 'empty@b.com' }] })).toMatchObject({ done: true, email: 'empty@b.com', count: 0 });
    expect(connectProgress({}, { connected: false, sites: [{ site_url: 'x.com' }] }).done).toBe(false);
    expect(connectedMessage({ email: 'you@b.com', count: 2 })).toBe('Connected you@b.com: 2 sites.');
    expect(connectedMessage({ email: null, count: 1 })).toBe('Connected: 1 site.');
  });

  it('opens the link with the platform command', () => {
    expect(openCommand('https://a.test/?x=1&y=2', 'darwin')).toEqual({ command: 'open', args: ['https://a.test/?x=1&y=2'], options: {} });
    expect(openCommand('https://a.test/', 'linux')).toEqual({ command: 'xdg-open', args: ['https://a.test/'], options: {} });
    expect(openCommand('https://a.test/?x=1&y=2', 'win32')).toEqual({
      command: 'cmd',
      args: ['/c', 'start', '""', 'https://a.test/?x=1^&y=2'],
      options: { windowsVerbatimArguments: true },
    });
    expect(openCommand('file:///etc/passwd', 'darwin')).toBeNull();
  });
});
