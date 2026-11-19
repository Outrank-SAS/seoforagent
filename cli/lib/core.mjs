import { randomBytes } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';

export const VERSION = '0.1.0';
export const DEFAULT_SITE = 'https://seoforagent.com';
export const KEY_PREFIX = 'sfa_live_';
export const KEY_PATTERN = /^sfa_live_[A-Za-z0-9_-]{40,60}$/;
export const KEY_ENV = 'SEOFORAGENT_API_KEY';
export const COMMANDS = ['init', 'status', 'help'];

const VALUE_FLAGS = { '--key': 'key' };
const BOOLEAN_FLAGS = { '--yes': 'yes', '-y': 'yes', '--help': 'help', '-h': 'help', '--version': 'version', '-v': 'version' };

export const siteUrl = (env = process.env) => String(env.SEOFORAGENT_URL || DEFAULT_SITE).replace(/\/+$/, '');

export const generateKey = () => `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;

export const isKey = (value) => typeof value === 'string' && KEY_PATTERN.test(value);

export const parseArgs = (argv) => {
  const result = { command: null, flags: { key: null, yes: false, help: false, version: false }, errors: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inline] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    if (name in VALUE_FLAGS) {
      const value = inline ?? argv[index + 1];
      if (inline === undefined) index += 1;
      if (!value || value.startsWith('-')) result.errors.push(`${name} needs a value.`);
      else result.flags[VALUE_FLAGS[name]] = value;
      continue;
    }
    if (name in BOOLEAN_FLAGS && inline === undefined) {
      result.flags[BOOLEAN_FLAGS[name]] = true;
      continue;
    }
    if (arg.startsWith('-')) {
      result.errors.push(`Unknown option ${arg}.`);
      continue;
    }
    if (result.command === null) result.command = arg;
    else result.errors.push(`Unexpected argument ${arg}.`);
  }
  if (result.command !== null && !COMMANDS.includes(result.command)) result.errors.push(`Unknown command ${result.command}.`);
  if (result.command === null) result.command = 'help';
  return result;
};

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

Usage
  npx seoforagent init [--key <key>] [--yes]   Create an API key, print its activation link and connect your agent
  npx seoforagent status [--key <key>]         Show the plan and balances behind a key
  npx seoforagent help                         Show this help

Options
  --key <key>   Use this key. status also reads ${KEY_ENV}.
  --yes, -y     With init: add SEOforAgent to Claude Code without asking.
  --version     Print the version.
`;
