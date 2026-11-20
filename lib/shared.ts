import { pick, pickArray, pickBool, pickNumber, pickString } from './pick';

export const SHAREABLE_TOOLS = ['ai_visibility_check', 'listicles_find', 'ai_visibility_diagnose'] as const;
export type SharedTool = (typeof SHAREABLE_TOOLS)[number];

export const ENGINES = ['chatgpt', 'perplexity', 'gemini', 'claude'] as const;
export const ENGINE_LABELS: Record<string, string> = { chatgpt: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini', claude: 'Claude' };

export const engineLabel = (engine: string): string => ENGINE_LABELS[engine.toLowerCase()] ?? engine;

export const engineOrder = (engine: string): number => {
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

export const DIAGNOSIS_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type DiagnosisSeverity = (typeof DIAGNOSIS_SEVERITIES)[number];

export const PAGE_HOW_LABELS: Record<string, string> = { pitch: 'Pitch the author', join: 'Join the thread', profile: 'Complete your profile' };

export interface DiagnosisReason {
  id: string;
  severity: DiagnosisSeverity;
  title: string;
  evidence: string;
}

export interface DiagnosisTool {
  tool: string;
  why: string;
  estCostUsd: number | undefined;
}

export interface DiagnosisOutrank {
  product: string;
  what: string;
  price: string;
  whyRelevant: string;
  limits: string;
  url: string | null;
}

export interface DiagnosisAction {
  id: string;
  title: string;
  why: string;
  steps: string[];
  effort: string;
  cost: string;
  expect: string;
  tools: DiagnosisTool[];
  outrank: DiagnosisOutrank | null;
}

export interface DiagnosisWinner {
  name: string;
  domain: string;
  answers: number;
  ownSiteCited: number;
}

export interface DiagnosisPage {
  url: string;
  domain: string;
  title: string;
  type: string;
  how: string;
  citedInAnswers: number;
  engines: string[];
  names: string[];
}

export interface DiagnosisDraft {
  rewarded: string;
  pageTitle: string;
  pageTypeLabel: string;
  pageAngle: string;
}

export interface DiagnosisPrompt {
  prompt: string;
  mentionedOn: string[];
  missingOn: string[];
  recommended: string[];
  google: { top20: boolean; position: number | undefined } | null;
  drafted: DiagnosisDraft | null;
}

export interface Diagnosis {
  brand: string;
  verdict: string;
  score: { answers: number; mentioned: number; cited: number; missed: number; prompts: number; engines: string[] };
  reasons: DiagnosisReason[];
  actions: DiagnosisAction[];
  whoWins: DiagnosisWinner[];
  citedPages: { outsideYourSite: number; thirdPartyRead: number; mentionYou: number } | null;
  pages: DiagnosisPage[];
  prompts: DiagnosisPrompt[];
  limits: string[];
}

export interface SharedResult {
  tool: SharedTool;
  title: string;
  createdAt: string;
  domain: string;
  ai: SharedAi | null;
  listicles: SharedListicles | null;
  diagnosis: Diagnosis | null;
}

export type SharedLookup = { status: 'ok'; result: SharedResult } | { status: 'not_found' } | { status: 'error' };

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{6,200}$/;
const MAX_LISTICLE_PAGES = 20;

export const isShareToken = (token: string): boolean => TOKEN_SHAPE.test(token);

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : []);

export const safeHttpUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

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

const engineList = (value: unknown): string[] =>
  strings(value)
    .map((engine) => engine.toLowerCase())
    .sort((a, b) => engineOrder(a) - engineOrder(b));

const parseOutrank = (value: unknown): DiagnosisOutrank | null => {
  const product = pickString(value, ['product']);
  const what = pickString(value, ['what']);
  if (!product && !what) return null;
  const url = safeHttpUrl(pickString(value, ['url']));
  return {
    product,
    what,
    price: pickString(value, ['price']),
    whyRelevant: pickString(value, ['why_relevant']),
    limits: pickString(value, ['limits']),
    url: url && url.startsWith('https://') ? url : null,
  };
};

const parseDraft = (value: unknown): DiagnosisDraft | null => {
  const draft = {
    rewarded: pickString(value, ['rewarded']),
    pageTitle: pickString(value, ['page_title']),
    pageTypeLabel: pickString(value, ['page_type_label']),
    pageAngle: pickString(value, ['page_angle']),
  };
  return draft.pageTitle || draft.pageAngle || draft.rewarded ? draft : null;
};

export const parseDiagnosis = (data: unknown): Diagnosis => {
  const answers = pickNumber(data, ['score.answers']) ?? 0;
  const mentioned = pickNumber(data, ['score.mentioned']) ?? 0;
  return {
    brand: pickString(data, ['brand']),
    verdict: pickString(data, ['verdict']),
    score: {
      answers,
      mentioned,
      cited: pickNumber(data, ['score.cited']) ?? 0,
      missed: pickNumber(data, ['score.missed']) ?? Math.max(0, answers - mentioned),
      prompts: pickNumber(data, ['score.prompts']) ?? pickArray(data, ['prompts']).length,
      engines: engineList(pick(data, ['score.engines'])),
    },
    reasons: pickArray(data, ['reasons'])
      .map((row) => {
        const severity = pickString(row, ['severity']).toLowerCase();
        return {
          id: pickString(row, ['id']),
          severity: (DIAGNOSIS_SEVERITIES as readonly string[]).includes(severity) ? (severity as DiagnosisSeverity) : 'low',
          title: pickString(row, ['title']),
          evidence: pickString(row, ['evidence']),
        };
      })
      .filter((row) => row.title || row.evidence),
    actions: pickArray(data, ['actions'])
      .map((row) => ({
        id: pickString(row, ['id']),
        title: pickString(row, ['title']),
        why: pickString(row, ['why']),
        steps: strings(row.steps),
        effort: pickString(row, ['effort']),
        cost: pickString(row, ['cost']),
        expect: pickString(row, ['expect']),
        tools: pickArray(row, ['tools'])
          .map((tool) => ({ tool: pickString(tool, ['tool']), why: pickString(tool, ['why']), estCostUsd: pickNumber(tool, ['est_cost_usd']) }))
          .filter((tool) => tool.tool),
        outrank: parseOutrank(row.outrank),
      }))
      .filter((row) => row.title),
    whoWins: pickArray(data, ['who_wins'])
      .map((row) => ({
        name: pickString(row, ['name']),
        domain: pickString(row, ['domain']),
        answers: pickNumber(row, ['answers']) ?? 0,
        ownSiteCited: pickNumber(row, ['own_site_cited']) ?? 0,
      }))
      .filter((row) => row.name),
    citedPages:
      pickNumber(data, ['cited_pages.outside_your_site']) === undefined
        ? null
        : {
            outsideYourSite: pickNumber(data, ['cited_pages.outside_your_site']) ?? 0,
            thirdPartyRead: pickNumber(data, ['cited_pages.third_party_read']) ?? 0,
            mentionYou: pickNumber(data, ['cited_pages.mention_you']) ?? 0,
          },
    pages: pickArray(data, ['pages_to_get_on'])
      .map((row) => ({
        url: pickString(row, ['url']),
        domain: pickString(row, ['domain']),
        title: pickString(row, ['untrusted_text.title', 'title']),
        type: pickString(row, ['type']),
        how: pickString(row, ['how']).toLowerCase(),
        citedInAnswers: pickNumber(row, ['cited_in_answers']) ?? 0,
        engines: engineList(row.engines),
        names: strings(row.names),
      }))
      .filter((row) => row.url),
    prompts: pickArray(data, ['prompts'])
      .map((row) => {
        const top20 = pickBool(row, ['google_top_20']);
        return {
          prompt: pickString(row, ['prompt']),
          mentionedOn: engineList(row.mentioned_on),
          missingOn: engineList(row.missing_on),
          recommended: strings(row.recommended),
          google: top20 === undefined ? null : { top20, position: pickNumber(row, ['google_position']) },
          drafted: parseDraft(row.drafted),
        };
      })
      .filter((row) => row.prompt),
    limits: strings(pick(data, ['limits'])),
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
    diagnosis: tool === 'ai_visibility_diagnose' ? parseDiagnosis(inner) : null,
  };
};

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

export const sharedHeadline = (result: SharedResult): string => {
  if (result.ai) return `Mentioned in ${result.ai.mentioned} of ${result.ai.answers} AI ${plural(result.ai.answers, 'answer', 'answers')}`;
  if (result.diagnosis) {
    const { missed, answers } = result.diagnosis.score;
    return `Left out of ${missed} of ${answers} AI ${plural(answers, 'answer', 'answers')}`;
  }
  const lists = result.listicles;
  if (!lists) return 'Shared result';
  return `${lists.pagesFound} ${plural(lists.pagesFound, 'list ranks or gets cited', 'lists rank or get cited')} for these queries, ${lists.worthPaying} worth being on`;
};

export const sharedSubject = (result: SharedResult): string => result.ai?.brand || result.diagnosis?.brand || result.domain;

export const sharedDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
