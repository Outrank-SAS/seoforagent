#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  CONNECT_POLL_MS,
  CONNECT_TIMEOUT_MS,
  HELP,
  KEY_ENV,
  VERSION,
  activationLink,
  callTool,
  claudeArgs,
  connectedMessage,
  connectLink,
  connectProgress,
  findOnPath,
  generateKey,
  insightsLines,
  inspectLines,
  isKey,
  keyFilePath,
  listTools,
  openCommand,
  overviewLines,
  parseArgs,
  pendingMessage,
  performanceLines,
  resolveKey,
  saveKey,
  siteUrl,
  sitesLines,
  snippets,
  statusLines,
  toolRequest,
  toolsLines,
} from '../lib/core.mjs';

const out = (text = '') => process.stdout.write(`${text}\n`);
const err = (text = '') => process.stderr.write(`${text}\n`);
const fail = (text) => {
  err(text);
  process.exitCode = 1;
};
const print = (lines) => lines.forEach((line) => out(line));

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
  let saved = false;
  try {
    out(`Saved the key to ${saveKey(key)} for the other seoforagent commands.`);
    saved = true;
  } catch (error) {
    out(`Could not save the key to ${keyFilePath()}: ${error instanceof Error ? error.message : error}. Pass --key or set ${KEY_ENV} instead.`);
  }
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
  out('Or work from the terminal, starting with Google Search Console: npx seoforagent gsc connect');
  out(`Check the key any time: npx seoforagent status${saved ? '' : ` --key ${key}`}`);
};

const keyProblem = (key) => {
  if (!key) {
    return {
      ok: false,
      error: { code: 'API_KEY_REQUIRED', message: `No key. Pass --key <key>, set ${KEY_ENV} or run npx seoforagent init.` },
      agent_guidance: 'Ask the human for their SEOforAgent API key, or to run npx seoforagent init, then pass it with --key.',
    };
  }
  if (!isKey(key)) {
    return {
      ok: false,
      error: { code: 'INVALID_KEY', message: 'That does not look like a SEOforAgent key. Keys start with sfa_live_.' },
      agent_guidance: 'Ask the human for the key shown in their dashboard at https://seoforagent.com/app/keys.',
    };
  }
  return null;
};

const status = async (flags) => {
  const { key } = resolveKey({ flag: flags.key });
  const problem = keyProblem(key);
  if (problem) return fail(problem.error.message);
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
    if (envelope?.error?.code === 'ACTIVATION_REQUIRED' || response.status === 402) err(`Activate the key: ${activationLink(key, site)}`);
    return;
  }
  for (const line of statusLines(envelope.data ?? envelope)) out(line);
};

const reportFailure = (envelope, context) => {
  fail(envelope?.error?.message || 'The call failed.');
  if (envelope?.agent_guidance) err(envelope.agent_guidance);
  if (envelope?.error?.code === 'ACTIVATION_REQUIRED' && context.key) err(`Activate the key: ${activationLink(context.key, context.site)}`);
};

const finish = (envelope, flags, context, render) => {
  if (flags.json) {
    out(JSON.stringify(envelope));
    if (envelope?.ok === false) process.exitCode = 1;
    return;
  }
  if (envelope?.ok === false) return reportFailure(envelope, context);
  render(envelope?.data, envelope);
};

const openInBrowser = (url) => {
  const plan = openCommand(url);
  if (!plan) return false;
  try {
    const child = spawn(plan.command, plan.args, { ...plan.options, stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
};

const gscConnect = async (flags, context) => {
  if (flags.json) return finish(await callTool('gsc_connect', {}, context), flags, context, () => {});
  const before = await callTool('gsc_sites', {}, context);
  const started = await callTool('gsc_connect', {}, context);
  if (started?.ok === false) return reportFailure(started, context);
  const link = connectLink(started.data);
  if (!link) {
    out(started.data?.message || 'Search Console is already connected.');
    if (started.agent_guidance) out(started.agent_guidance);
    return;
  }
  out('Open this link and approve Search Console access with your Google account:');
  out(indent(link));
  out();
  if (!flags.noOpen && openInBrowser(link)) out('Opened it in your browser.');
  out('Waiting for Google. Press Ctrl+C to stop.');
  const baseline = before?.ok === false ? {} : before?.data;
  const told = new Set();
  const deadline = Date.now() + CONNECT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(CONNECT_POLL_MS);
    const now = await callTool('gsc_sites', {}, context);
    if (now?.ok === false) continue;
    const progress = connectProgress(baseline, now?.data);
    for (const email of progress.pending.filter((pending) => !told.has(pending))) {
      told.add(email);
      out(pendingMessage(email));
    }
    if (progress.done) {
      out();
      out(connectedMessage(progress));
      out('Next: npx seoforagent gsc overview');
      return;
    }
  }
  fail('Search Console is not connected after 10 minutes. Check with npx seoforagent gsc sites, or run npx seoforagent gsc connect again.');
};

const RENDERERS = {
  sites: (data) => print(sitesLines(data)),
  overview: (data) => print(overviewLines(data)),
  query: (data, parsed) => print(performanceLines(data, { dimensions: parsed.flags.dimensions, compare: parsed.flags.compare })),
  insights: (data) => print(insightsLines(data)),
  inspect: (data) => print(inspectLines(data)),
};

const runTool = async (parsed) => {
  const { flags } = parsed;
  const site = siteUrl();
  const { key } = resolveKey({ flag: flags.key });
  const context = { site, key };
  const problem = keyProblem(key);
  if (problem) return finish(problem, flags, context, () => {});

  if (parsed.command === 'tools') {
    return finish(await listTools(context), flags, context, (tools) => print(toolsLines(tools)));
  }
  if (parsed.command === 'gsc' && parsed.subcommand === 'connect') return gscConnect(flags, context);

  const request = toolRequest(parsed);
  const envelope = await callTool(request.name, request.arguments, context);
  if (parsed.command === 'call') {
    if (flags.json) return finish(envelope, flags, context, () => {});
    out(JSON.stringify(envelope, null, 2));
    if (envelope?.ok === false) reportFailure(envelope, context);
    return;
  }
  return finish(envelope, flags, context, (data) => RENDERERS[parsed.subcommand](data, parsed));
};

const main = async () => {
  const parsed = parseArgs(process.argv.slice(2));
  const { command, flags, errors } = parsed;
  if (flags.version) return out(VERSION);
  if (errors.length > 0) {
    fail(errors.join('\n'));
    err();
    err(HELP.trimEnd());
    return;
  }
  if (flags.help || command === 'help') return out(HELP);
  if (command === 'init') return init(flags);
  if (command === 'status') return status(flags);
  return runTool(parsed);
};

await main();
