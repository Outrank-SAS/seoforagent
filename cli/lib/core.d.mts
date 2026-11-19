export const VERSION: string;
export const DEFAULT_SITE: string;
export const KEY_PREFIX: string;
export const KEY_PATTERN: RegExp;
export const KEY_ENV: string;
export const COMMANDS: string[];
export const HELP: string;

export interface ParsedArgs {
  command: string;
  flags: { key: string | null; yes: boolean; help: boolean; version: boolean };
  errors: string[];
}

export interface Snippet {
  agent: string;
  where: string;
  code: string;
}

export function siteUrl(env?: Record<string, string | undefined>): string;
export function generateKey(): string;
export function isKey(value: unknown): value is string;
export function parseArgs(argv: string[]): ParsedArgs;
export function activationLink(key: string, site?: string): string;
export function mcpUrl(site?: string): string;
export function claudeArgs(key: string, site?: string): string[];
export function claudeCommand(key: string, site?: string): string;
export function codexConfig(key: string, site?: string): string;
export function cursorConfig(key: string, site?: string): string;
export function snippets(key: string, site?: string): Snippet[];
export function findOnPath(name: string, env?: Record<string, string | undefined>, platform?: string): string | null;
export function statusLines(data: unknown): string[];
