import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, isAbsolute, join } from 'node:path';

export const VERSION = '0.2.0';
export const DEFAULT_SITE = 'https://seoforagent.com';
export const KEY_PREFIX = 'sfa_live_';
export const KEY_PATTERN = /^sfa_live_[A-Za-z0-9_-]{40,60}$/;
export const KEY_ENV = 'SEOFORAGENT_API_KEY';
export const COMMANDS = ['init', 'status', 'help', 'call', 'tools', 'gsc'];
export const GSC_COMMANDS = ['connect', 'sites', 'overview', 'query', 'insights', 'inspect'];
export const DIMENSIONS = ['query', 'page', 'country', 'device', 'date'];
export const DEVICES = ['DESKTOP', 'MOBILE', 'TABLET'];
export const OVERVIEW_DAYS = [7, 28, 90];
export const MAX_CELL = 60;
export const CONNECT_POLL_MS = 3000;
export const CONNECT_TIMEOUT_MS = 10 * 60 * 1000;

const VALUE_FLAGS = {
  '--key': 'key',
  '--days': 'days',
  '--dimensions': 'dimensions',
  '--limit': 'limit',
  '--query-contains': 'queryContains',
  '--page-contains': 'pageContains',
  '--country': 'country',
  '--device': 'device',
};
const BOOLEAN_FLAGS = {
  '--yes': 'yes',
  '-y': 'yes',
  '--help': 'help',
  '-h': 'help',
  '--version': 'version',
  '-v': 'version',
  '--json': 'json',
  '--no-open': 'noOpen',
  '--compare': 'compare',
};
const ALWAYS_ALLOWED = ['help', 'version'];

const SPECS = {
  init: { flags: ['key', 'yes'], positionals: [] },
  status: { flags: ['key', 'yes'], positionals: [] },
  help: { flags: ['key', 'yes'], positionals: [] },
  call: { flags: ['key', 'json'], positionals: ['tool'], optional: ['json-args'] },
  tools: { flags: ['key', 'json'], positionals: [] },
  'gsc connect': { flags: ['key', 'json', 'noOpen'], positionals: [] },
  'gsc sites': { flags: ['key', 'json'], positionals: [] },
  'gsc overview': { flags: ['key', 'json', 'days'], positionals: [] },
  'gsc query': {
    flags: ['key', 'json', 'days', 'dimensions', 'compare', 'limit', 'queryContains', 'pageContains', 'country', 'device'],
    positionals: ['site'],
  },
  'gsc insights': { flags: ['key', 'json', 'days'], positionals: ['site'] },
  'gsc inspect': { flags: ['key', 'json'], positionals: ['url'] },
};

const DEFAULT_FLAGS = {
  key: null,
  yes: false,
  help: false,
  version: false,
  json: false,
  noOpen: false,
  compare: false,
  days: null,
  dimensions: null,
  limit: null,
  queryContains: null,
  pageContains: null,
  country: null,
  device: null,
};

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const asArray = (value) => (Array.isArray(value) ? value : []);
const firstDefined = (...values) => values.find((value) => value !== undefined);

const integerIn = (text, min, max) => (/^\d+$/.test(text) && Number(text) >= min && Number(text) <= max ? Number(text) : null);

const VALUE_PARSERS = {
  key: (text) => ({ value: text }),
  days: (text) => {
    const value = integerIn(text, 1, 480);
    return value === null ? { error: '--days takes a number of days, for example 28.' } : { value };
  },
  limit: (text) => {
    const value = integerIn(text, 1, 25000);
    return value === null ? { error: '--limit takes a number of rows from 1 to 25000.' } : { value };
  },
  dimensions: (text) => {
    const value = text
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    return value.length === 0 || value.some((part) => !DIMENSIONS.includes(part))
      ? { error: `--dimensions takes a comma list of ${DIMENSIONS.join(', ')}.` }
      : { value };
  },
  device: (text) => (DEVICES.includes(text.toUpperCase()) ? { value: text.toUpperCase() } : { error: `--device takes ${DEVICES.join(', ')}.` }),
  country: (text) => (/^[a-z]{3}$/i.test(text) ? { value: text.toLowerCase() } : { error: '--country takes a three-letter country code, for example usa.' }),
  queryContains: (text) => ({ value: text }),
  pageContains: (text) => ({ value: text }),
};

export const siteUrl = (env = process.env) => String(env.SEOFORAGENT_URL || DEFAULT_SITE).replace(/\/+$/, '');

export const generateKey = () => `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;

export const isKey = (value) => typeof value === 'string' && KEY_PATTERN.test(value);

export const parseToolArguments = (text) => {
  if (text === undefined || text.trim() === '') return { value: {} };
  try {
    const value = JSON.parse(text);
    if (isObject(value)) return { value };
  } catch {
    return { error: 'The tool arguments must be a JSON object, for example \'{"site":"example.com"}\'.' };
  }
  return { error: 'The tool arguments must be a JSON object, for example \'{"site":"example.com"}\'.' };
};

export const parseArgs = (argv) => {
  const result = { command: null, subcommand: null, positionals: [], flags: { ...DEFAULT_FLAGS }, errors: [] };
  const typed = {};
  const words = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inline] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    if (name in VALUE_FLAGS) {
      const flag = VALUE_FLAGS[name];
      const value = inline ?? argv[index + 1];
      if (inline === undefined) index += 1;
      typed[flag] = name;
      if (!value || value.startsWith('-')) {
        result.errors.push(`${name} needs a value.`);
        continue;
      }
      const parsed = VALUE_PARSERS[flag](value);
      if (parsed.error) result.errors.push(parsed.error);
      else result.flags[flag] = parsed.value;
      continue;
    }
    if (name in BOOLEAN_FLAGS && inline === undefined) {
      result.flags[BOOLEAN_FLAGS[name]] = true;
      typed[BOOLEAN_FLAGS[name]] = name;
      continue;
    }
    if (arg.startsWith('-')) {
      result.errors.push(`Unknown option ${arg}.`);
      continue;
    }
    words.push(arg);
  }

  const [command = null, ...rest] = words;
  result.command = command;
  if (command !== null && !COMMANDS.includes(command)) {
    result.errors.push(`Unknown command ${command}.`);
    return result;
  }
  if (command === null) result.command = 'help';

  let positionals = rest;
  if (result.command === 'gsc') {
    const [subcommand = null, ...after] = rest;
    positionals = after;
    result.subcommand = subcommand;
    if (subcommand === null) {
      if (!result.flags.help) result.errors.push(`gsc needs a command: ${GSC_COMMANDS.join(', ')}.`);
      return result;
    }
    if (!GSC_COMMANDS.includes(subcommand)) {
      result.errors.push(`Unknown gsc command ${subcommand}. Use one of: ${GSC_COMMANDS.join(', ')}.`);
      return result;
    }
  }

  const label = result.subcommand ? `${result.command} ${result.subcommand}` : result.command;
  const spec = SPECS[label];
  for (const [flag, name] of Object.entries(typed)) {
    if (!ALWAYS_ALLOWED.includes(flag) && !spec.flags.includes(flag)) result.errors.push(`${name} does not apply to ${label}.`);
  }
  const optional = spec.optional ?? [];
  if (positionals.length < spec.positionals.length && !result.flags.help) {
    result.errors.push(`${label} needs <${spec.positionals[positionals.length]}>.`);
  }
  for (const extra of positionals.slice(spec.positionals.length + optional.length)) result.errors.push(`Unexpected argument ${extra}.`);
  result.positionals = positionals.slice(0, spec.positionals.length + optional.length);

  if (label === 'gsc overview' && result.flags.days !== null && !OVERVIEW_DAYS.includes(result.flags.days)) {
    result.errors.push(`gsc overview takes --days ${OVERVIEW_DAYS.join(', ')}.`);
  }
  if (label === 'call' && result.positionals.length > 1) {
    const parsed = parseToolArguments(result.positionals[1]);
    if (parsed.error) result.errors.push(parsed.error);
  }
  return result;
};

const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== null && value !== undefined));

export const toolRequest = (parsed) => {
  const { command, subcommand, positionals, flags } = parsed;
  if (command === 'call') return { name: positionals[0], arguments: parseToolArguments(positionals[1]).value ?? {} };
  if (command !== 'gsc') return null;
  if (subcommand === 'connect') return { name: 'gsc_connect', arguments: {} };
  if (subcommand === 'sites') return { name: 'gsc_sites', arguments: {} };
  if (subcommand === 'overview') return { name: 'gsc_overview', arguments: compact({ days: flags.days }) };
  if (subcommand === 'insights') return { name: 'gsc_insights', arguments: compact({ site: positionals[0], days: flags.days }) };
  if (subcommand === 'inspect') return { name: 'gsc_inspect_url', arguments: { url: positionals[0] } };
  if (subcommand === 'query') {
    const filters = compact({ query_contains: flags.queryContains, page_contains: flags.pageContains, country: flags.country, device: flags.device });
    return {
      name: 'gsc_performance',
      arguments: compact({
        site: positionals[0],
        dimensions: flags.dimensions,
        days: flags.days,
        compare: flags.compare || null,
        row_limit: flags.limit,
        filters: Object.keys(filters).length > 0 ? filters : null,
      }),
    };
  }
  return null;
};

export const configDir = (env = process.env, home = homedir()) =>
  join(env.XDG_CONFIG_HOME && isAbsolute(env.XDG_CONFIG_HOME) ? env.XDG_CONFIG_HOME : join(home, '.config'), 'seoforagent');

export const keyFilePath = (env = process.env, home = homedir()) => join(configDir(env, home), 'key');

export const readSavedKey = (path = keyFilePath()) => {
  try {
    return readFileSync(path, 'utf8').trim() || null;
  } catch {
    return null;
  }
};

export const saveKey = (key, path = keyFilePath()) => {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${key}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
};

export const resolveKey = ({ flag = null, env = process.env, readSaved = () => readSavedKey(keyFilePath(env)) } = {}) => {
  if (flag) return { key: flag, source: '--key' };
  if (env[KEY_ENV]) return { key: env[KEY_ENV], source: KEY_ENV };
  const saved = readSaved();
  if (saved) return { key: saved, source: 'saved' };
  return { key: null, source: null };
};

export const mcpHeaders = (key) => ({
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
  'User-Agent': `seoforagent-cli/${VERSION}`,
});

export const rpcBody = (id, method, params) => ({ jsonrpc: '2.0', id, method, params });

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const pickMessage = (value) => {
  if (Array.isArray(value)) return value.find((item) => isObject(item) && ('result' in item || 'error' in item)) ?? null;
  return isObject(value) ? value : null;
};

export const parseRpcBody = (text) => {
  const body = String(text ?? '').trim();
  if (!body) return null;
  if (body.startsWith('{') || body.startsWith('[')) return pickMessage(parseJson(body)) ?? null;
  const events = body
    .split(/\r?\n\r?\n/)
    .map((event) =>
      event
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).replace(/^ /, ''))
        .join('\n'),
    )
    .filter(Boolean);
  for (const data of events.reverse()) {
    const message = pickMessage(parseJson(data));
    if (message) return message;
  }
  return null;
};

const TOOL_HINT = 'Run npx seoforagent tools to see the tool names, then check the arguments.';

const failure = (code, message, extra = {}) => ({ ok: false, error: { code, message }, ...extra });

export const envelopeFromRpc = (message) => {
  if (!isObject(message)) return failure('BAD_RESPONSE', 'SEOforAgent sent an answer the CLI could not read.');
  if (isObject(message.error)) {
    return failure('MCP_ERROR', message.error.message || 'The MCP server returned an error.', {
      details: { rpc_code: message.error.code },
      agent_guidance: TOOL_HINT,
    });
  }
  const result = message.result;
  if (!isObject(result)) return failure('BAD_RESPONSE', 'SEOforAgent sent an answer the CLI could not read.');
  if (isObject(result.structuredContent)) {
    const envelope = result.structuredContent;
    return 'ok' in envelope ? envelope : { ok: result.isError !== true, ...envelope };
  }
  const text = asArray(result.content)
    .filter((part) => part?.type === 'text')
    .map((part) => part.text)
    .join('\n');
  const parsed = parseJson(text);
  if (isObject(parsed) && 'ok' in parsed) return parsed;
  if (result.isError === true) return failure('TOOL_ERROR', text || 'The tool failed.', { agent_guidance: TOOL_HINT });
  return { ok: true, data: parsed ?? text };
};

export const mcpRequest = async ({ site, key, method, params, fetchImpl = globalThis.fetch, timeoutMs = 120000 }) => {
  let response;
  try {
    response = await fetchImpl(`${site}/mcp`, {
      method: 'POST',
      headers: mcpHeaders(key),
      body: JSON.stringify(rpcBody(1, method, params)),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { envelope: failure('NETWORK_ERROR', `Could not reach ${site}. Check your connection and try again.`) };
  }
  let text = '';
  try {
    text = await response.text();
  } catch {
    text = '';
  }
  const message = parseRpcBody(text);
  if (!message) {
    if (response.status === 401 || response.status === 403) {
      return { envelope: failure('UNAUTHORIZED', 'SEOforAgent rejected this key. Check it with npx seoforagent status.') };
    }
    return { envelope: failure('HTTP_ERROR', `SEOforAgent answered with HTTP ${response.status} and no readable body.`) };
  }
  return { message };
};

export const callTool = async (name, args, options) => {
  const { envelope, message } = await mcpRequest({ ...options, method: 'tools/call', params: { name, arguments: args ?? {} } });
  return envelope ?? envelopeFromRpc(message);
};

export const listTools = async (options) => {
  const { envelope, message } = await mcpRequest({ ...options, method: 'tools/list', params: {} });
  if (envelope) return envelope;
  if (isObject(message?.error)) return envelopeFromRpc(message);
  const tools = message?.result?.tools;
  return Array.isArray(tools) ? { ok: true, data: tools } : failure('BAD_RESPONSE', 'SEOforAgent sent an answer the CLI could not read.');
};

export const openCommand = (url, platform = process.platform) => {
  if (!/^https?:\/\//i.test(String(url))) return null;
  if (platform === 'darwin') return { command: 'open', args: [url], options: {} };
  if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '""', url.replace(/&/g, '^&')], options: { windowsVerbatimArguments: true } };
  return { command: 'xdg-open', args: [url], options: {} };
};

export const formatNumber = (value) => (isNumber(value) ? String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '–');

export const formatDelta = (value) => (isNumber(value) ? `${value > 0 ? '+' : ''}${formatNumber(value)}` : '–');

export const formatCtr = (fraction) => (isNumber(fraction) ? `${(fraction * 100).toFixed(1)}%` : '–');

export const formatChange = (percent) => (isNumber(percent) ? `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%` : '–');

export const formatPosition = (value) => (isNumber(value) ? value.toFixed(1) : '–');

export const truncate = (text, max = MAX_CELL) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const NUMERIC_CELL = /^([+-]?\d[\d,]*(\.\d+)?%?|–)$/;

export const formatTable = (headers, rows, { maxWidth = MAX_CELL } = {}) => {
  const cells = rows.map((row) => headers.map((_, column) => truncate(row[column] === null || row[column] === undefined || row[column] === '' ? '–' : String(row[column]), maxWidth)));
  const right = headers.map((_, column) => cells.length > 0 && cells.every((row) => NUMERIC_CELL.test(row[column])));
  const widths = headers.map((header, column) => Math.max(header.length, ...cells.map((row) => row[column].length)));
  const line = (row) =>
    row
      .map((cell, column) => (right[column] ? cell.padStart(widths[column]) : cell.padEnd(widths[column])))
      .join('  ')
      .trimEnd();
  return [line(headers), ...cells.map(line)];
};

const plural = (count, word) => `${formatNumber(count)} ${word}${count === 1 ? '' : 's'}`;

const metric = (row, name) => {
  const value = row?.[name];
  if (isNumber(value)) return value;
  if (isObject(value)) return firstDefined(value.value, value.current);
  return undefined;
};

const previousOf = (row, name) => firstDefined(row?.[`${name}_prev`], row?.[`previous_${name}`], row?.previous?.[name]);

const changePercent = (row, name) => {
  const given = firstDefined(row?.[`${name}_change_pct`], row?.[`${name}_change_percent`], isObject(row?.[name]) ? row[name].change_pct : undefined);
  if (given !== undefined) return given;
  const current = metric(row, name);
  const previous = previousOf(row, name);
  if (isNumber(current) && isNumber(previous)) return previous === 0 ? null : ((current - previous) / previous) * 100;
  return undefined;
};

const clicksDelta = (row) => {
  if (isNumber(row?.clicks_change)) return formatDelta(row.clicks_change);
  const previous = previousOf(row, 'clicks');
  if (isNumber(previous) && isNumber(metric(row, 'clicks'))) return formatDelta(metric(row, 'clicks') - previous);
  return formatChange(changePercent(row, 'clicks'));
};

const emailOf = (item) => (typeof item === 'string' ? item : firstDefined(item?.google_email, item?.email, null));

export const gscSiteList = (data) => asArray(firstDefined(data?.sites, data?.properties));

const projectName = (site) => {
  const project = site?.project;
  if (typeof project === 'string') return project;
  return firstDefined(project?.name, project?.domain, site?.project_name, project?.id, site?.project_id, null);
};

export const sitesLines = (data) => {
  const sites = gscSiteList(data);
  const lines = [];
  if (sites.length === 0) lines.push('No Search Console sites yet. Run: npx seoforagent gsc connect');
  else lines.push(...formatTable(['Site', 'Google account', 'Project'], sites.map((site) => [firstDefined(site?.site_url, site?.site), emailOf(site), projectName(site)])));
  for (const email of pendingEmails(data)) lines.push('', pendingMessage(email));
  return lines;
};

export const pendingEmails = (data) => asArray(data?.pending).map(emailOf).filter(Boolean);

export const pendingMessage = (email) => `Google approved ${email}. Finish on the seoforagent.com page that opened (sign in there if asked).`;

const accountEmails = (data) => new Set([...gscSiteList(data).map(emailOf), ...asArray(data?.accounts).map(emailOf)].filter(Boolean));

export const connectProgress = (before, after) => {
  const sitesBefore = gscSiteList(before);
  const sitesAfter = gscSiteList(after);
  const knownEmails = accountEmails(before);
  const newEmails = [...accountEmails(after)].filter((email) => !knownEmails.has(email));
  const knownSites = new Set(sitesBefore.map((site) => `${firstDefined(site?.site_url, site?.site)}|${emailOf(site)}`));
  const newSites = sitesAfter.filter((site) => !knownSites.has(`${firstDefined(site?.site_url, site?.site)}|${emailOf(site)}`));
  const done = after?.connected === true && (sitesAfter.length > sitesBefore.length || newEmails.length > 0);
  const email = firstDefined(newEmails[0], emailOf(newSites[0]) ?? undefined, null);
  const forEmail = email ? sitesAfter.filter((site) => emailOf(site) === email).length : 0;
  const count = forEmail > 0 ? forEmail : sitesAfter.length;
  return { done, email, count, pending: pendingEmails(after) };
};

export const connectedMessage = ({ email, count }) => `Connected${email ? ` ${email}` : ''}: ${plural(count, 'site')}.`;

export const connectLink = (data) => {
  const link = firstDefined(data?.url, data?.auth_url, data?.link, data?.connect_url, data?.authorization_url);
  return typeof link === 'string' ? link : null;
};

export const overviewLines = (data) => {
  const rows = asArray(firstDefined(data?.sites, data?.rows, data?.domains));
  if (rows.length === 0) return ['No Search Console data yet. Run: npx seoforagent gsc connect'];
  const lines = formatTable(
    ['Domain', 'Clicks', 'Change', 'Impressions', 'Change', 'CTR', 'Position'],
    rows.map((row) => [
      firstDefined(row?.domain || undefined, row?.site, row?.site_url),
      formatNumber(metric(row, 'clicks')),
      formatChange(changePercent(row, 'clicks')),
      formatNumber(metric(row, 'impressions')),
      formatChange(changePercent(row, 'impressions')),
      formatCtr(metric(row, 'ctr')),
      formatPosition(metric(row, 'position')),
    ]),
  );
  const totals = firstDefined(data?.totals, data?.total);
  if (isObject(totals)) {
    const clicks = metric(totals, 'clicks');
    const impressions = metric(totals, 'impressions');
    const ctr = firstDefined(metric(totals, 'ctr'), isNumber(clicks) && isNumber(impressions) && impressions > 0 ? clicks / impressions : undefined);
    const period = [isNumber(data?.days) ? `last ${data.days} days` : null, data?.data_through ? `data through ${data.data_through}` : null].filter(Boolean).join(', ');
    lines.push(
      '',
      `Total${period ? ` (${period})` : ''}: ${formatNumber(clicks)} clicks (${formatChange(changePercent(totals, 'clicks'))}), ` +
        `${formatNumber(impressions)} impressions (${formatChange(changePercent(totals, 'impressions'))}), ` +
        `CTR ${formatCtr(ctr)}${isNumber(metric(totals, 'position')) ? `, position ${formatPosition(metric(totals, 'position'))}` : ''}`,
    );
  }
  const failed = rows.filter((row) => row?.ok === false && row?.error);
  for (const row of failed) lines.push(`${row?.domain || row?.site_url}: ${row.error}`);
  return lines;
};

const capitalize = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

export const performanceLines = (data, { dimensions = null, compare = false } = {}) => {
  const rows = asArray(data?.rows);
  if (rows.length === 0) return ['No rows for these filters.'];
  const dims = asArray(firstDefined(data?.dimensions, dimensions ?? undefined, ['query']));
  const headers = [...dims.map(capitalize), 'Clicks', 'Impressions', 'CTR', 'Position', ...(compare ? ['Clicks change'] : [])];
  return formatTable(
    headers,
    rows.map((row) => [
      ...dims.map((dimension, index) => firstDefined(row?.keys?.[index], row?.[dimension])),
      formatNumber(metric(row, 'clicks')),
      formatNumber(metric(row, 'impressions')),
      formatCtr(metric(row, 'ctr')),
      formatPosition(metric(row, 'position')),
      ...(compare ? [clicksDelta(row)] : []),
    ]),
  );
};

const itemLines = (items, labels) => {
  const has = (test) => items.some(test);
  const columns = [
    ...labels.filter((label) => has((item) => Boolean(item?.[label]))).map((label) => [capitalize(label), true, (item) => item?.[label]]),
    ['Clicks', has((item) => isNumber(metric(item, 'clicks'))), (item) => formatNumber(metric(item, 'clicks'))],
    ['Change', has((item) => item?.clicks_change !== undefined || changePercent(item, 'clicks') !== undefined), clicksDelta],
    ['Impressions', has((item) => isNumber(metric(item, 'impressions'))), (item) => formatNumber(metric(item, 'impressions'))],
    ['Position', has((item) => isNumber(metric(item, 'position'))), (item) => formatPosition(metric(item, 'position'))],
  ].filter(([, shown]) => shown);
  return formatTable(
    columns.map(([header]) => header),
    items.map((item) => columns.map(([, , cell]) => cell(item))),
  );
};

const INSIGHT_SECTIONS = [
  ['Pages up', 'pages', 'up', ['page']],
  ['Pages down', 'pages', 'down', ['page']],
  ['Queries up', 'queries', 'up', ['query']],
  ['Queries down', 'queries', 'down', ['query']],
];

const actionText = (action) => {
  if (typeof action === 'string') return [action];
  const title = firstDefined(action?.title, action?.action, action?.text, action?.summary);
  const detail = firstDefined(action?.detail, action?.why, action?.reason, action?.description);
  return [title ?? JSON.stringify(action), ...(detail ? [detail] : [])];
};

export const insightsLines = (data, limit = 10) => {
  const lines = ['What to do'];
  const actions = asArray(data?.actions);
  if (actions.length === 0) lines.push('  Nothing urgent.');
  actions.forEach((action, index) => {
    const [title, ...detail] = actionText(action);
    lines.push(`  ${index + 1}. ${title}`, ...detail.map((text) => `     ${text}`));
  });
  const sections = [
    ...INSIGHT_SECTIONS.map(([title, kind, direction, labels]) => [title, firstDefined(data?.[`${kind}_${direction}`], data?.[kind]?.[direction]), labels]),
    ['Striking distance', firstDefined(data?.striking_distance, data?.striking), ['query', 'page']],
  ];
  for (const [title, value, labels] of sections) {
    const items = asArray(value).slice(0, limit);
    lines.push('', title);
    if (items.length === 0) lines.push('  None.');
    else lines.push(...itemLines(items, labels).map((line) => `  ${line}`));
  }
  return lines;
};

export const inspectLines = (data) => {
  const source = firstDefined(
    data?.index_status,
    data?.indexStatusResult,
    data?.inspection_result?.index_status_result,
    data?.inspectionResult?.indexStatusResult,
    data,
  );
  const read = (snake, camel) => firstDefined(source?.[snake], source?.[camel], data?.[snake], data?.[camel]) ?? '–';
  const rows = [
    ['URL', read('url', 'inspectionUrl')],
    ['Verdict', read('verdict', 'verdict')],
    ['Coverage', read('coverage_state', 'coverageState')],
    ['Last crawl', read('last_crawl_time', 'lastCrawlTime')],
    ['Google canonical', read('google_canonical', 'googleCanonical')],
  ];
  return rows.filter(([label, value]) => label !== 'URL' || value !== '–').map(([label, value]) => `${`${label}:`.padEnd(18)}${value}`);
};

export const firstSentence = (text) => {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  const match = clean.match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1] : clean;
};

export const toolsLines = (tools) =>
  formatTable(
    ['Tool', 'What it does'],
    asArray(tools).map((tool) => [tool?.name, firstSentence(tool?.description)]),
    { maxWidth: 120 },
  );

export const activationLink = (key, site = DEFAULT_SITE) => `${site}/activate#${key}`;

export const mcpUrl = (site = DEFAULT_SITE) => `${site}/mcp`;

export const claudeArgs = (key, site = DEFAULT_SITE) => ['mcp', 'add', '--transport', 'http', 'seoforagent', mcpUrl(site), '--header', `Authorization: Bearer ${key}`];

export const claudeCommand = (key, site = DEFAULT_SITE) => `claude mcp add --transport http seoforagent ${mcpUrl(site)} --header "Authorization: Bearer ${key}"`;

export const codexConfig = (key, site = DEFAULT_SITE) =>
  ['[mcp_servers.seoforagent]', `url = "${mcpUrl(site)}"`, `http_headers = { Authorization = "Bearer ${key}" }`].join('\n');

export const cursorConfig = (key, site = DEFAULT_SITE) =>
  JSON.stringify({ mcpServers: { seoforagent: { url: mcpUrl(site), headers: { Authorization: `Bearer ${key}` } } } }, null, 2);

export const snippets = (key, site = DEFAULT_SITE) => [
  { agent: 'Claude Code', where: 'Run in your terminal', code: claudeCommand(key, site) },
  { agent: 'Codex', where: 'Add to ~/.codex/config.toml, then restart Codex', code: codexConfig(key, site) },
  { agent: 'Cursor', where: 'Merge into ~/.cursor/mcp.json', code: cursorConfig(key, site) },
];

export const findOnPath = (name, env = process.env, platform = process.platform) => {
  const extensions = platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const dir of String(env.PATH || '').split(delimiter)) {
    if (!dir) continue;
    for (const extension of extensions) {
      const candidate = join(dir, `${name}${extension}`);
      try {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
      } catch {
        continue;
      }
    }
  }
  return null;
};

const usd = (value) => (typeof value === 'number' && Number.isFinite(value) ? `$${value.toFixed(2)}` : null);

export const statusLines = (data) => {
  const access = data?.access ?? {};
  const balance = data?.balance ?? {};
  const plan = access.plan_label || access.plan || 'No plan';
  const included = usd(balance.included_left_usd);
  const total = usd(balance.included_per_period_usd);
  const lines = [`Plan: ${plan}${access.active === false ? ' (not active)' : ''}`];
  if (included) lines.push(`Included usage left: ${included}${total ? ` of ${total}` : ''}`);
  lines.push(`One-time credit: ${usd(balance.credit_usd) ?? '$0.00'}`);
  if (Array.isArray(data?.projects)) lines.push(`Projects: ${data.projects.length}`);
  return lines;
};

export const HELP = `seoforagent ${VERSION}
The SEO tool for AI agents, by Outrank. https://seoforagent.com

Set up
  npx seoforagent init [--key <key>] [--yes]   Create an API key, print its activation link, save it and connect your agent
  npx seoforagent status [--key <key>]         Show the plan and balances behind a key

Google Search Console
  npx seoforagent gsc connect [--no-open]      Open the Google link and wait until the new sites show up
  npx seoforagent gsc sites                    List the connected sites, their Google account and project
  npx seoforagent gsc overview [--days 28]     Clicks, impressions, CTR and position for every site (--days 7, 28 or 90)
  npx seoforagent gsc query <site> [options]   Clicks, impressions, CTR and position by query, page, country, device or date
      --dimensions query,page   --days 28   --compare   --limit 50
      --query-contains <text>   --page-contains <text>   --country usa   --device MOBILE
  npx seoforagent gsc insights <site> [--days 28]
                                               What to do, pages and queries up and down, striking distance
  npx seoforagent gsc inspect <url>            Google index status of one URL: verdict, coverage, last crawl, canonical

Any tool
  npx seoforagent tools                        List every tool with what it does
  npx seoforagent call <tool> ['<json>']       Call any tool, for example: call gsc_sites '{}'

Options
  --key <key>   Use this key. Otherwise ${KEY_ENV}, then the key init saved in ~/.config/seoforagent/key.
  --json        Print the raw JSON response instead of a table. Agents should always pass it.
  --yes, -y     With init: add SEOforAgent to Claude Code without asking.
  --version     Print the version.

Agents without MCP
  Run npx seoforagent call <tool> '{...}' --json, or any gsc command with --json. The output is the
  same JSON envelope the MCP server returns (ok, data, error, agent_guidance). The exit code is 1 when ok is false.
`;
