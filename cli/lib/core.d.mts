export const VERSION: string;
export const DEFAULT_SITE: string;
export const KEY_PREFIX: string;
export const KEY_PATTERN: RegExp;
export const KEY_ENV: string;
export const COMMANDS: string[];
export const GSC_COMMANDS: string[];
export const DIMENSIONS: string[];
export const DEVICES: string[];
export const OVERVIEW_DAYS: number[];
export const MAX_CELL: number;
export const CONNECT_POLL_MS: number;
export const CONNECT_TIMEOUT_MS: number;
export const HELP: string;

export interface Flags {
  key: string | null;
  yes: boolean;
  help: boolean;
  version: boolean;
  json: boolean;
  noOpen: boolean;
  compare: boolean;
  days: number | null;
  dimensions: string[] | null;
  limit: number | null;
  queryContains: string | null;
  pageContains: string | null;
  country: string | null;
  device: string | null;
}

export interface ParsedArgs {
  command: string | null;
  subcommand: string | null;
  positionals: string[];
  flags: Flags;
  errors: string[];
}

export interface Snippet {
  agent: string;
  where: string;
  code: string;
}

export interface Envelope {
  ok: boolean;
  data?: unknown;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
  agent_guidance?: string;
  [key: string]: unknown;
}

export interface ToolRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpOptions {
  site: string;
  key: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
}

export interface ConnectProgress {
  done: boolean;
  email: string | null;
  count: number;
  pending: string[];
}

export function siteUrl(env?: Record<string, string | undefined>): string;
export function generateKey(): string;
export function isKey(value: unknown): value is string;
export function parseToolArguments(text: string | undefined): { value?: Record<string, unknown>; error?: string };
export function parseArgs(argv: string[]): ParsedArgs;
export function toolRequest(parsed: ParsedArgs): ToolRequest | null;
export function configDir(env?: Record<string, string | undefined>, home?: string): string;
export function keyFilePath(env?: Record<string, string | undefined>, home?: string): string;
export function readSavedKey(path?: string): string | null;
export function saveKey(key: string, path?: string): string;
export function resolveKey(options?: {
  flag?: string | null;
  env?: Record<string, string | undefined>;
  readSaved?: () => string | null;
}): { key: string | null; source: string | null };
export function mcpHeaders(key: string): Record<string, string>;
export function rpcBody(id: number, method: string, params: unknown): { jsonrpc: '2.0'; id: number; method: string; params: unknown };
export function parseRpcBody(text: string | null | undefined): Record<string, unknown> | null;
export function envelopeFromRpc(message: unknown): Envelope;
export function mcpRequest(options: McpOptions & { method: string; params: unknown }): Promise<{ envelope?: Envelope; message?: Record<string, unknown> }>;
export function callTool(name: string, args: Record<string, unknown> | undefined, options: McpOptions): Promise<Envelope>;
export function listTools(options: McpOptions): Promise<Envelope>;
export function openCommand(url: string, platform?: string): { command: string; args: string[]; options: Record<string, unknown> } | null;
export function formatNumber(value: unknown): string;
export function formatDelta(value: unknown): string;
export function formatCtr(fraction: unknown): string;
export function formatChange(percent: unknown): string;
export function formatPosition(value: unknown): string;
export function truncate(text: string, max?: number): string;
export function formatTable(headers: string[], rows: unknown[][], options?: { maxWidth?: number }): string[];
export function gscSiteList(data: unknown): unknown[];
export function sitesLines(data: unknown): string[];
export function pendingEmails(data: unknown): string[];
export function pendingMessage(email: string): string;
export function connectProgress(before: unknown, after: unknown): ConnectProgress;
export function connectedMessage(progress: { email: string | null; count: number }): string;
export function connectLink(data: unknown): string | null;
export function overviewLines(data: unknown): string[];
export function performanceLines(data: unknown, options?: { dimensions?: string[] | null; compare?: boolean }): string[];
export function insightsLines(data: unknown, limit?: number): string[];
export function inspectLines(data: unknown): string[];
export function firstSentence(text: unknown): string;
export function toolsLines(tools: unknown): string[];
export function activationLink(key: string, site?: string): string;
export function mcpUrl(site?: string): string;
export function claudeArgs(key: string, site?: string): string[];
export function claudeCommand(key: string, site?: string): string;
export function codexConfig(key: string, site?: string): string;
export function cursorConfig(key: string, site?: string): string;
export function snippets(key: string, site?: string): Snippet[];
export function findOnPath(name: string, env?: Record<string, string | undefined>, platform?: string): string | null;
export function statusLines(data: unknown): string[];
