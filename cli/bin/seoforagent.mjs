#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import {
  HELP,
  KEY_ENV,
  VERSION,
  activationLink,
  claudeArgs,
  findOnPath,
  generateKey,
  isKey,
  parseArgs,
  siteUrl,
  snippets,
  statusLines,
} from '../lib/core.mjs';

const out = (text = '') => process.stdout.write(`${text}\n`);
const fail = (text) => {
  process.stderr.write(`${text}\n`);
  process.exitCode = 1;
};

const indent = (text) =>
  text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

const confirm = async (question) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(`${question} (y/N) `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
};

const printSnippets = (key, site) => {
  for (const snippet of snippets(key, site)) {
    out(`${snippet.agent}. ${snippet.where}:`);
    out(indent(snippet.code));
    out();
  }
};

const init = async (flags) => {
  if (flags.key && !isKey(flags.key)) return fail('That does not look like a SEOforAgent key. Keys start with sfa_live_.');
  const site = siteUrl();
  const key = flags.key || generateKey();

  out('SEOforAgent: the SEO tool for AI agents');
  out();
  out(flags.key ? 'Your API key:' : 'Your new API key. Keep it private:');
  out(indent(key));
  out();
  out('1. Activate it. Plans from $9 a month, or credit once from $10:');
  out(indent(activationLink(key, site)));
  out();
  out('2. Connect your agent.');
  out();

  const claude = process.platform === 'win32' ? null : findOnPath('claude');
  if (claude && (flags.yes || (await confirm('Claude Code is installed. Add SEOforAgent to it now?')))) {
    const result = spawnSync(claude, claudeArgs(key, site), { stdio: 'inherit' });
    if (result.status === 0) {
      out();
      out('Added to Claude Code.');
      out();
    } else {
      out();
      out('Claude Code did not accept the command. Add it by hand:');
      out();
      printSnippets(key, site);
    }
  } else {
    printSnippets(key, site);
  }

  out('3. Open your agent and say:');
  out(indent('Set up SEOforAgent for me. Call whoami, ask for my website and suggest three next steps with what each costs.'));
  out();
  out(`Check the key any time: npx seoforagent status --key ${key}`);
};

const status = async (flags) => {
  const key = flags.key || process.env[KEY_ENV];
  if (!key) return fail(`No key. Pass --key <key> or set ${KEY_ENV}.`);
  if (!isKey(key)) return fail('That does not look like a SEOforAgent key. Keys start with sfa_live_.');
  const site = siteUrl();
  let response;
  try {
    response = await fetch(`${site}/api/v1/sfa/whoami`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${key}`, 'User-Agent': `seoforagent-cli/${VERSION}` },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return fail(`Could not reach ${site}. Check your connection and try again.`);
  }
  let envelope = null;
  try {
    envelope = await response.json();
  } catch {
    envelope = null;
  }
  if (!envelope || envelope.ok === false || !response.ok) {
    fail(envelope?.error?.message || `SEOforAgent answered with HTTP ${response.status}.`);
    if (envelope?.error?.code === 'ACTIVATION_REQUIRED' || response.status === 402) process.stderr.write(`Activate the key: ${activationLink(key, site)}\n`);
    return;
  }
  for (const line of statusLines(envelope.data ?? envelope)) out(line);
};

const main = async () => {
  const { command, flags, errors } = parseArgs(process.argv.slice(2));
  if (flags.version) return out(VERSION);
  if (errors.length > 0) {
    fail(errors.join('\n'));
    process.stderr.write(`\n${HELP}`);
    return;
  }
  if (flags.help || command === 'help') return out(HELP);
  if (command === 'init') return init(flags);
  if (command === 'status') return status(flags);
};

await main();
