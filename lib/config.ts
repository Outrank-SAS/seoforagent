const DEFAULT_API_BASE = 'https://www.outrank.so/api/agent/v1';
const DEFAULT_SITE_URL = 'https://seoforagent.com';

const trimSlash = (value: string): string => value.replace(/\/+$/, '');

export const OUTRANK_API_BASE = trimSlash(process.env.OUTRANK_API_BASE || DEFAULT_API_BASE);
export const SITE_URL = trimSlash(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
export const REWARDFUL_KEY = process.env.NEXT_PUBLIC_REWARDFUL_KEY || '';
export const CLI_PUBLISHED = process.env.NEXT_PUBLIC_CLI_PUBLISHED === 'true';

export const SITE_NAME = 'SEOforAgent';
export const MCP_URL = `${SITE_URL}/mcp`;
export const PUBLIC_API_BASE = `${SITE_URL}/api/v1`;
export const OUTRANK_URL = 'https://www.outrank.so';
export const GITHUB_REPO = 'Outrank-SAS/seoforagent';
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
export const GITHUB_PUBLIC = process.env.NEXT_PUBLIC_GITHUB_PUBLIC === 'true';
export const SUPPORT_EMAIL = 'support@outrank.so';
export const KEY_PREFIX = 'sfa_live_';
export const KEY_PATTERN = /^sfa_live_[A-Za-z0-9_-]{40,60}$/;
export const PENDING_KEY_STORAGE = 'sfa_pending_key';
export const ACTIVE_KEY_STORAGE = 'sfa_key';
export const OAUTH_RETURN_STORAGE = 'sfa_oauth_return';
export const OAUTH_RETURN_MAX_AGE_MS = 30 * 60 * 1000;
