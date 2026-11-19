import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KEY_PATTERN } from '@/lib/config';
import { claudeCodeCommand, codexConfig as siteCodexConfig, cursorConfig as siteCursorConfig } from '@/lib/setup';
import {
  activationLink,
  claudeArgs,
  claudeCommand,
  codexConfig,
  cursorConfig,
  findOnPath,
  generateKey,
  isKey,
  parseArgs,
  siteUrl,
  statusLines,
} from '../cli/lib/core.mjs';

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
    expect(parseArgs([])).toEqual({ command: 'help', flags: { key: null, yes: false, help: false, version: false }, errors: [] });
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
