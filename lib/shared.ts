import { pick, pickArray, pickBool, pickNumber, pickString } from './pick';

export const SHAREABLE_TOOLS = ['ai_visibility_check', 'listicles_find'] as const;
export type SharedTool = (typeof SHAREABLE_TOOLS)[number];

export const ENGINES = ['chatgpt', 'perplexity', 'gemini', 'claude'] as const;
export const ENGINE_LABELS: Record<string, string> = { chatgpt: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini', claude: 'Claude' };

export const engineLabel = (engine: string): string => ENGINE_LABELS[engine.toLowerCase()] ?? engine;

const engineOrder = (engine: string): number => {
  const index = (ENGINES as readonly string[]).indexOf(engine.toLowerCase());
  return index === -1 ? ENGINES.length : index;
};

export interface EngineSummary {
  engine: string;
  answers: number;
  mentioned: number;
  cited: number;
}

export interface SharedAnswer {
  prompt: string;
  engine: string;
  mentioned: boolean;
  cited: boolean;
  competitors: string[];
}

export interface SharedAi {
  brand: string;
  prompts: string[];
  answers: number;
  mentioned: number;
  cited: number;
  byEngine: EngineSummary[];
  topSources: { domain: string; answers: number }[];
  rows: SharedAnswer[];
}

export interface SharedListiclePage {
  domain: string;
  url: string;
  title: string;
  type: string;
  google: { query: string; position: number }[];
  citedBy: string[];
  domainRating: number | undefined;
  listsYou: boolean;
  worthPaying: boolean;
  score: number | undefined;
}

export interface SharedListicles {
  queries: string[];
  pagesFound: number;
  worthPaying: number;
  pages: SharedListiclePage[];
}

export interface SharedResult {
  tool: SharedTool;
  title: string;
  createdAt: string;
  domain: string;
  ai: SharedAi | null;
  listicles: SharedListicles | null;
}

export type SharedLookup = { status: 'ok'; result: SharedResult } | { status: 'not_found' } | { status: 'error' };

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{6,200}$/;
const MAX_LISTICLE_PAGES = 20;

export const isShareToken = (token: string): boolean => TOKEN_SHAPE.test(token);

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : []);

const parseAi = (data: unknown): SharedAi => {
  const rows: SharedAnswer[] = pickArray(data, ['answers']).map((row) => ({
    prompt: pickString(row, ['prompt']),
    engine: pickString(row, ['engine']).toLowerCase(),
    mentioned: pickBool(row, ['mentioned']) ?? false,
    cited: pickBool(row, ['cited']) ?? false,
    competitors: strings(row.competitors_named),
  }));
  const prompts = strings(pick(data, ['prompts']));
  const byEngine = pickArray(data, ['summary.by_engine'])
    .map((row) => ({
      engine: pickString(row, ['engine']).toLowerCase(),
      answers: pickNumber(row, ['answers']) ?? 0,
      mentioned: pickNumber(row, ['mentioned']) ?? 0,
      cited: pickNumber(row, ['cited']) ?? 0,
    }))
    .filter((row) => row.engine)
    .sort((a, b) => engineOrder(a.engine) - engineOrder(b.engine));
  return {
    brand: pickString(data, ['brand']),
    prompts: prompts.length > 0 ? prompts : [...new Set(rows.map((row) => row.prompt).filter(Boolean))],
    answers: pickNumber(data, ['summary.answers']) ?? rows.length,
    mentioned: pickNumber(data, ['summary.mentioned']) ?? rows.filter((row) => row.mentioned).length,
    cited: pickNumber(data, ['summary.cited']) ?? rows.filter((row) => row.cited).length,
    byEngine,
    topSources: pickArray(data, ['summary.top_sources'])
      .map((row) => ({ domain: pickString(row, ['domain']), answers: pickNumber(row, ['answers']) ?? 0 }))
      .filter((row) => row.domain),
    rows,
  };
};

const parseListicles = (data: unknown): SharedListicles => {
  const pages: SharedListiclePage[] = pickArray(data, ['pages'])
    .slice(0, MAX_LISTICLE_PAGES)
    .map((row) => ({
      domain: pickString(row, ['domain']),
      url: pickString(row, ['url']),
      title: pickString(row, ['title', 'untrusted_text.title']),
      type: pickString(row, ['type']),
      google: pickArray(row, ['google'])
        .map((item) => ({ query: pickString(item, ['query']), position: pickNumber(item, ['position']) ?? 0 }))
        .filter((item) => item.position > 0),
      citedBy: strings(row.cited_by),
      domainRating: pickNumber(row, ['domain_rating']),
      listsYou: pickBool(row, ['lists_you']) ?? false,
      worthPaying: pickBool(row, ['worth_paying']) ?? false,
      score: pickNumber(row, ['score']),
    }));
  return {
    queries: strings(pick(data, ['queries'])),
    pagesFound: pickNumber(data, ['pages_found']) ?? pages.length,
    worthPaying: pickNumber(data, ['worth_paying']) ?? pages.filter((page) => page.worthPaying).length,
    pages,
  };
};

export const parseShared = (payload: unknown): SharedResult | null => {
  const data = pick(payload, ['data']) ?? payload;
  const tool = pickString(data, ['tool']);
  if (!(SHAREABLE_TOOLS as readonly string[]).includes(tool)) return null;
  const inner = pick(data, ['data']);
  if (!inner || typeof inner !== 'object') return null;
  return {
    tool: tool as SharedTool,
    title: pickString(data, ['title']),
    createdAt: pickString(data, ['created_at']),
    domain: pickString(data, ['domain']),
    ai: tool === 'ai_visibility_check' ? parseAi(inner) : null,
    listicles: tool === 'listicles_find' ? parseListicles(inner) : null,
  };
};

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

export const sharedHeadline = (result: SharedResult): string => {
  if (result.ai) return `Mentioned in ${result.ai.mentioned} of ${result.ai.answers} AI ${plural(result.ai.answers, 'answer', 'answers')}`;
  const lists = result.listicles;
  if (!lists) return 'Shared result';
  return `${lists.pagesFound} ${plural(lists.pagesFound, 'list ranks or gets cited', 'lists rank or get cited')} for these queries, ${lists.worthPaying} worth being on`;
};

export const sharedSubject = (result: SharedResult): string => result.ai?.brand || result.domain;

export const safeHttpUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

export const sharedDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
